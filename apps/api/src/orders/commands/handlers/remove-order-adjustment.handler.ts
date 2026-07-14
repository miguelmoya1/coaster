import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderAdjustmentsUpdatedEvent } from '../../events';
import { RemoveOrderAdjustmentCommand } from '../impl/remove-order-adjustment.command';
import { OrdersMapper, OrderWithRelations } from '../../mappers/orders.mapper';

@CommandHandler(RemoveOrderAdjustmentCommand)
export class RemoveOrderAdjustmentHandler implements ICommandHandler<RemoveOrderAdjustmentCommand, void> {
  readonly #logger = new Logger(RemoveOrderAdjustmentHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveOrderAdjustmentCommand): Promise<void> {
    this.#logger.debug(`Executing removeOrderAdjustment...`);

    const orderDb = await this.readRepo.findById(command.orderId);
    if (!orderDb || orderDb.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const adjustmentExists = orderDb.adjustments.some(a => a.id === command.adjustmentId);
    if (!adjustmentExists) {
      throw new NotFoundException('Adjustment not found');
    }

    const updatedOrderDb = await this.writeRepo.removeAdjustmentFromOrder(command.orderId, command.adjustmentId);
    const updatedOrderDomain = OrdersMapper.toDomain(updatedOrderDb as OrderWithRelations);

    this.#logger.debug(`Publishing OrderAdjustmentsUpdatedEvent...`);
    this._eventBus.publish(new OrderAdjustmentsUpdatedEvent(command.barId, command.orderId, updatedOrderDomain.adjustments));
  }
}
