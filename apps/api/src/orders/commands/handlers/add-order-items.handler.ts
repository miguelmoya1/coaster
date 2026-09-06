import { ErrorCodes, OrderStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderItemsAddedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { AddOrderItemsCommand } from '../impl/add-order-items.command';
import type { ProductSnapshot } from '../../data-access/orders.write.repository';
import { resolveTaxRate } from '@coaster/common';

@CommandHandler(AddOrderItemsCommand)
export class AddOrderItemsHandler implements ICommandHandler<AddOrderItemsCommand, void> {
  readonly #logger = new Logger(AddOrderItemsHandler.name);

  constructor(
    private readonly readRepo: OrdersReadRepository,
    private readonly writeRepo: OrdersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AddOrderItemsCommand): Promise<void> {
    this.#logger.debug(`Executing addOrderItems...`);
    const existingOrder = await this.readRepo.findById(command.orderId);
    if (!existingOrder || existingOrder.establishmentId !== command.establishmentId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== OrderStatus.OPEN) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const productIds = command.dto.items.map((i) => i.productId);
    const products = await this.readRepo.findProductsByIds(command.establishmentId, productIds);
    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const snapshots = new Map<string, ProductSnapshot>(
      products.map((p) => [
        p.id,
        { price: p.price, name: p.name, taxRate: resolveTaxRate(p.taxRate, p.category.taxRate) },
      ]),
    );
    const additionalAmount = command.dto.items.reduce(
      (sum, item) => sum + (snapshots.get(item.productId)?.price ?? 0) * item.quantity,
      0,
    );

    const order = await this.writeRepo.addItemsToOrder(
      command.orderId,
      additionalAmount,
      command.dto,
      snapshots,
      existingOrder.totalAmount,
    );

    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderItemsAddedEvent...`);
    this._eventBus.publish(
      new OrderItemsAddedEvent(
        command.establishmentId,
        mapped,
        command.dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      ),
    );
  }
}
