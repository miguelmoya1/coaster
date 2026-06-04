import { ErrorCodes } from '../../../core';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrderDeletedEvent } from '../../../events';
import { OrdersRepository } from '../../data-access/orders.repository';
import { DeleteOrderCommand } from './delete-order.command';

@CommandHandler(DeleteOrderCommand)
export class DeleteOrderHandler implements ICommandHandler<DeleteOrderCommand, void> {
  readonly #logger = new Logger(DeleteOrderHandler.name);

  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

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
    this.#logger.debug(`Publishing OrderDeletedEvent...`);
    this._eventBus.publish(new OrderDeletedEvent(command.barId, command.orderId));
  }
}
