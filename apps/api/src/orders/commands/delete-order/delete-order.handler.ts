import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderDeletedEvent } from '../../events';
import { DeleteOrderCommand } from './delete-order.command';

@CommandHandler(DeleteOrderCommand)
export class DeleteOrderHandler implements ICommandHandler<DeleteOrderCommand, void> {
  readonly #logger = new Logger(DeleteOrderHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteOrderCommand): Promise<void> {
    const order = await this.readRepo.findById(command.orderId);
    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status === 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const today = Temporal.Now.plainDateISO();
    const orderDate = Temporal.Instant.fromEpochMilliseconds(order.createdAt.getTime())
      .toZonedDateTimeISO('UTC')
      .toPlainDate();

    if (Temporal.PlainDate.compare(orderDate, today) < 0) {
      throw new BadRequestException('CANNOT_DELETE_PAST_ORDER');
    }

    await this.writeRepo.deleteOrder(command.orderId);
    this.#logger.debug(`Publishing OrderDeletedEvent...`);
    this._eventBus.publish(new OrderDeletedEvent(command.barId, command.orderId));
  }
}
