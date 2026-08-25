import { ErrorCodes, TableStatus, asTableId } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderCreatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CreateOrderCommand } from '../impl/create-order.command';
import type { ProductSnapshot } from '../../data-access/orders.write.repository';
import { resolveTaxRate } from '@coaster/common';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, void> {
  readonly #logger = new Logger(CreateOrderHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<void> {
    this.#logger.debug(`Executing createOrder...`);
    const productIds = command.dto.items.map((i) => i.productId);
    const products = await this.readRepo.findProductsByIds(command.establishmentId, productIds);
    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    let resolvedTableName: string | null = null;

    if (command.dto.tableId) {
      const table = await this.readRepo.findTableById(asTableId(command.dto.tableId));
      if (!table || table.establishmentId !== command.establishmentId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
      if (table.status === TableStatus.OCCUPIED) {
        throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
      }
      resolvedTableName = table.name;
    }

    const snapshots = new Map<string, ProductSnapshot>(
      products.map((p) => [
        p.id,
        { price: p.price, name: p.name, taxRate: resolveTaxRate(p.taxRate, p.category.taxRate) },
      ]),
    );
    const totalAmount = command.dto.items.reduce(
      (sum, item) => sum + (snapshots.get(item.productId)?.price ?? 0) * item.quantity,
      0,
    );

    const order = await this.writeRepo.createOrder(
      command.establishmentId,
      command.dto,
      snapshots,
      totalAmount,
      resolvedTableName,
      command.createdById,
    );
    const mapped = OrdersMapper.toDomain(order);

    this.#logger.debug(`Publishing OrderCreatedEvent...`);
    this._eventBus.publish(
      new OrderCreatedEvent(
        command.establishmentId,
        mapped,
        command.dto.tableId ? asTableId(command.dto.tableId) : null,
      ),
    );
  }
}
