import { ErrorCodes } from '../../../core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { DeleteOrderCommand } from './delete-order.command';

@CommandHandler(DeleteOrderCommand)
export class DeleteOrderHandler implements ICommandHandler<DeleteOrderCommand, void> {
  constructor(private readonly _ordersRepository: OrdersRepository) {}

  async execute(command: DeleteOrderCommand): Promise<void> {
    const order = await this._ordersRepository.findById(command.orderId);
    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status === 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(order.createdAt);
    if (orderDate < today) {
      throw new BadRequestException('CANNOT_DELETE_PAST_ORDER');
    }

    await this._ordersRepository.deleteOrder(command.orderId);
  }
}
