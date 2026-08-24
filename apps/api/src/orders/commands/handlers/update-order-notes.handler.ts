import { ErrorCodes, OrderStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderUpdatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { UpdateOrderNotesCommand } from '../impl/update-order-notes.command';

@CommandHandler(UpdateOrderNotesCommand)
export class UpdateOrderNotesHandler implements ICommandHandler<UpdateOrderNotesCommand, void> {
  readonly #logger = new Logger(UpdateOrderNotesHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateOrderNotesCommand): Promise<void> {
    this.#logger.debug(`Executing updateOrderNotes...`);

    const order = await this.readRepo.findById(command.orderId);
    if (!order || order.establishmentId !== command.establishmentId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const updated = await this.writeRepo.updateOrderNotes(command.orderId, {
      ...(command.dto.notes !== undefined ? { notes: command.dto.notes.trim() || null } : {}),
      ...(command.dto.ticketNotes !== undefined ? { ticketNotes: command.dto.ticketNotes.trim() || null } : {}),
    });

    this.#logger.debug(`Publishing OrderUpdatedEvent...`);
    this._eventBus.publish(new OrderUpdatedEvent(command.establishmentId, OrdersMapper.toDomain(updated)));
  }
}
