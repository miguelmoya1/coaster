import type { Order } from '@coaster/common';
import { ErrorCodes, asTableId } from '../../../core';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderCancelledEvent } from '../../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CancelOrderCommand } from './cancel-order.command';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, Order> {
  readonly #logger = new Logger(CancelOrderHandler.name);

  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CancelOrderCommand): Promise<Order> {
    this.#logger.debug(`Executing cancelOrder...`);
    const existingOrder = await this._ordersRepository.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this._ordersRepository.cancelOrder(command.orderId, existingOrder.tableId);
    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderCancelledEvent...`);
    this._eventBus.publish(
      new OrderCancelledEvent(command.barId, mapped, existingOrder.tableId ? asTableId(existingOrder.tableId) : null),
    );

    return mapped;
  }
}
