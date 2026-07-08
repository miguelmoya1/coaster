import { ErrorCodes, OrderStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asProductId, asTableId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderCancelledEvent, OrderItemRemovedEvent, OrderUpdatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { RemoveOrderItemCommand } from '../impl/remove-order-item.command';

@CommandHandler(RemoveOrderItemCommand)
export class RemoveOrderItemHandler implements ICommandHandler<RemoveOrderItemCommand, void> {
  readonly #logger = new Logger(RemoveOrderItemHandler.name);

  constructor(
    private readonly readRepo: OrdersReadRepository,
    private readonly writeRepo: OrdersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveOrderItemCommand): Promise<void> {
    this.#logger.debug(`Executing removeOrderItem...`);

    const order = await this.readRepo.findById(command.orderId);

    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const item = order.items.find((i) => i.id === command.itemId);

    if (!item) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }

    const remainingItems = order.items.filter((i) => i.id !== command.itemId);

    if (remainingItems.length === 0) {
      const cancelled = await this.writeRepo.removeLastItemAndCancel(
        command.orderId,
        command.itemId,
        asTableId(order.tableId!),
      );
      const mapped = OrdersMapper.toDomain(cancelled);

      this.#logger.debug(`Publishing OrderItemRemovedEvent...`);
      this._eventBus.publish(
        new OrderItemRemovedEvent(command.barId, mapped, {
          productId: asProductId(item.productId),
          quantity: item.quantity,
        }),
      );

      this.#logger.debug(`Publishing OrderCancelledEvent...`);
      this._eventBus.publish(
        new OrderCancelledEvent(command.barId, mapped, order.tableId ? asTableId(order.tableId) : null),
      );
      return;
    }

    const result = await this.writeRepo.removeItemAndRecalculate(command.orderId, command.itemId);
    const mapped = OrdersMapper.toDomain(result);

    this.#logger.debug(`Publishing OrderItemRemovedEvent...`);
    this._eventBus.publish(
      new OrderItemRemovedEvent(command.barId, mapped, {
        productId: asProductId(item.productId),
        quantity: item.quantity,
      }),
    );

    this.#logger.debug(`Publishing OrderUpdatedEvent...`);
    this._eventBus.publish(new OrderUpdatedEvent(command.barId, mapped));
  }
}
