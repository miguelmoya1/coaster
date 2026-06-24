import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes, asTableId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderClosedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CheckoutOrderCommand } from '../impl/checkout-order.command';

@CommandHandler(CheckoutOrderCommand)
export class CheckoutOrderHandler implements ICommandHandler<CheckoutOrderCommand, void> {
  readonly #logger = new Logger(CheckoutOrderHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,

    private readonly readRepo: OrdersReadRepository,

    private readonly _ordersRepository: OrdersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CheckoutOrderCommand): Promise<void> {
    this.#logger.debug(`Executing checkoutOrder...`);
    const existingOrder = await this.readRepo.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this.writeRepo.checkoutOrder(command.orderId, existingOrder.tableId, command.paymentMethod);
    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderClosedEvent...`);
    this._eventBus.publish(
      new OrderClosedEvent(command.barId, mapped, existingOrder.tableId ? asTableId(existingOrder.tableId) : null),
    );
  }
}
