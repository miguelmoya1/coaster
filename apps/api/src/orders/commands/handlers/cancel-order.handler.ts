import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes, asTableId } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderCancelledEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CancelOrderCommand } from '../impl/cancel-order.command';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, void> {
  readonly #logger = new Logger(CancelOrderHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,

    private readonly readRepo: OrdersReadRepository,

    private readonly _ordersRepository: OrdersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    this.#logger.debug(`Executing cancelOrder...`);
    const existingOrder = await this.readRepo.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this.writeRepo.cancelOrder(command.orderId, existingOrder.tableId);
    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderCancelledEvent...`);
    this._eventBus.publish(
      new OrderCancelledEvent(command.barId, mapped, existingOrder.tableId ? asTableId(existingOrder.tableId) : null),
    );
  }
}
