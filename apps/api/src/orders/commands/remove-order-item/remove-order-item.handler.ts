import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveOrderItemCommand } from './remove-order-item.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { BarGateway } from '../../../core';
import { ErrorCodes, SocketEvents, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(RemoveOrderItemCommand)
export class RemoveOrderItemHandler implements ICommandHandler<RemoveOrderItemCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _barGateway: BarGateway,
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
      const cancelled = await this._ordersRepository.removeLastItemAndCancel(command.orderId, command.itemId, order.tableId);
      const mapped = OrdersMapper.toDomain(cancelled);
      this._barGateway.server.to(command.barId).emit(SocketEvents.ORDER_CANCELLED, mapped);

      if (order.tableId) {
        this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: order.tableId,
          status: 'FREE',
        });
      }

      return mapped;
    }

    const result = await this._ordersRepository.removeItemAndRecalculate(command.orderId, command.itemId);
    const mapped = OrdersMapper.toDomain(result);
    this._barGateway.server.to(command.barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }
}
