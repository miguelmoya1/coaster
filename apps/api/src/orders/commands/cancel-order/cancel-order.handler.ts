import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelOrderCommand } from './cancel-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { BarGateway } from '../../../core';
import { ErrorCodes, SocketEvents, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: CancelOrderCommand): Promise<Order> {
    const existingOrder = await this._ordersRepository.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this._ordersRepository.cancelOrder(command.orderId, existingOrder.tableId);
    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(command.barId).emit(SocketEvents.ORDER_CANCELLED, mapped);

    if (existingOrder.tableId) {
      this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: existingOrder.tableId,
        status: 'FREE',
      });
    }

    return mapped;
  }
}
