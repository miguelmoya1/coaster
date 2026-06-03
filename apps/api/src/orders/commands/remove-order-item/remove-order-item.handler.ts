import type { Order } from '@coaster/common';
import { asProductId, asTableId, ErrorCodes } from '../../../core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderCancelledEvent, OrderItemRemovedEvent, OrderUpdatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { RemoveOrderItemCommand } from './remove-order-item.command';

@CommandHandler(RemoveOrderItemCommand)
export class RemoveOrderItemHandler implements ICommandHandler<RemoveOrderItemCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveOrderItemCommand): Promise<Order> {
    const order = await this._ordersRepository.findById(command.orderId);
    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const item = order.items.find((i) => i.id === command.itemId);
    if (!item) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }

    const remainingItems = order.items.filter((i) => i.id !== command.itemId);

    if (remainingItems.length === 0) {
      const cancelled = await this._ordersRepository.removeLastItemAndCancel(
        command.orderId,
        command.itemId,
        order.tableId,
      );
      const mapped = OrdersMapper.toDomain(cancelled);

      this._eventBus.publish(
        new OrderItemRemovedEvent(command.barId, mapped, {
          productId: asProductId(item.productId),
          quantity: item.quantity,
        }),
      );

      this._eventBus.publish(
        new OrderCancelledEvent(command.barId, mapped, order.tableId ? asTableId(order.tableId) : null),
      );

      return mapped;
    }

    const result = await this._ordersRepository.removeItemAndRecalculate(command.orderId, command.itemId);
    const mapped = OrdersMapper.toDomain(result);

    this._eventBus.publish(
      new OrderItemRemovedEvent(command.barId, mapped, {
        productId: asProductId(item.productId),
        quantity: item.quantity,
      }),
    );

    this._eventBus.publish(new OrderUpdatedEvent(command.barId, mapped));
    return mapped;
  }
}
