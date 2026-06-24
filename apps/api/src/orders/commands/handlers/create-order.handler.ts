import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asTableId, ErrorCodes } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderCreatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CreateOrderCommand } from '../impl/create-order.command';

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
    const products = await this.readRepo.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    if (command.dto.tableId) {
      const table = await this.readRepo.findTableById(asTableId(command.dto.tableId));
      if (!table || table.barId !== command.barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
      if (table.status === 'OCCUPIED') {
        throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
      }
    }

    const priceMap = new Map<string, number>(products.map((p) => [p.id, p.price]));
    const totalAmount = command.dto.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    );

    let resolvedTableName: string | null = null;
    if (command.dto.tableId) {
      const table = await this.readRepo.findTableById(asTableId(command.dto.tableId));
      resolvedTableName = table?.name ?? null;
    }

    const order = await this.writeRepo.createOrder(
      command.barId,
      command.dto,
      priceMap as Map<string, number>,
      totalAmount,
      resolvedTableName,
    );
    const mapped = OrdersMapper.toDomain(order);

    this.#logger.debug(`Publishing OrderCreatedEvent...`);
    this._eventBus.publish(
      new OrderCreatedEvent(command.barId, mapped, command.dto.tableId ? asTableId(command.dto.tableId) : null),
    );
  }
}
