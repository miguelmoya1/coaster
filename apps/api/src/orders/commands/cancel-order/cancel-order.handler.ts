import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CancelOrderCommand } from './cancel-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { OrderCancelledEvent } from '../../events';
import { ErrorCodes, Order, asTableId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
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
    this._eventBus.publish(
      new OrderCancelledEvent(
        command.barId,
        mapped,
        existingOrder.tableId ? asTableId(existingOrder.tableId) : null,
      ),
    );

    return mapped;
  }
}
