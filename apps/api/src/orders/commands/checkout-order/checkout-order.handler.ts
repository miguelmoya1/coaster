import { ErrorCodes, asTableId } from '../../../core';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderClosedEvent } from '../../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CheckoutOrderCommand } from './checkout-order.command';

@CommandHandler(CheckoutOrderCommand)
export class CheckoutOrderHandler implements ICommandHandler<CheckoutOrderCommand, void> {
  readonly #logger = new Logger(CheckoutOrderHandler.name);

  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CheckoutOrderCommand): Promise<void> {
    this.#logger.debug(`Executing checkoutOrder...`);
    const existingOrder = await this._ordersRepository.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this._ordersRepository.checkoutOrder(command.orderId, existingOrder.tableId, command.paymentMethod as any);
    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderClosedEvent...`);
    this._eventBus.publish(
      new OrderClosedEvent(command.barId, mapped, existingOrder.tableId ? asTableId(existingOrder.tableId) : null),
    );
  }
}
