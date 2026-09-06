import { ErrorCodes, OrderStatus } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderUpdatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { UpdateOrderItemNotesCommand } from '../impl/update-order-item-notes.command';

@CommandHandler(UpdateOrderItemNotesCommand)
export class UpdateOrderItemNotesHandler implements ICommandHandler<UpdateOrderItemNotesCommand, void> {
  readonly #logger = new Logger(UpdateOrderItemNotesHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateOrderItemNotesCommand): Promise<void> {
    this.#logger.debug(`Executing updateOrderItemNotes...`);

    const order = await this.readRepo.findById(command.orderId);
    if (!order || order.establishmentId !== command.establishmentId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    if (!order.items.some((item) => item.id === command.itemId)) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }

    const updated = await this.writeRepo.updateOrderItemNotes(
      command.orderId,
      command.itemId,
      command.dto.notes?.trim() || null,
    );

    this.#logger.debug(`Publishing OrderUpdatedEvent...`);
    this._eventBus.publish(new OrderUpdatedEvent(command.establishmentId, OrdersMapper.toDomain(updated)));
  }
}
