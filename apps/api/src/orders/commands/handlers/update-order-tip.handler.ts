import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderTipUpdatedEvent } from '../../events';
import { UpdateOrderTipCommand } from '../impl/update-order-tip.command';

@CommandHandler(UpdateOrderTipCommand)
export class UpdateOrderTipHandler implements ICommandHandler<UpdateOrderTipCommand, void> {
  readonly #logger = new Logger(UpdateOrderTipHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateOrderTipCommand): Promise<void> {
    this.#logger.debug(`Executing updateOrderTip...`);

    const order = await this.readRepo.findById(command.orderId);
    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (command.dto.tipAmount < 0) {
      throw new BadRequestException('Tip amount cannot be negative');
    }

    await this.writeRepo.updateOrderTip(command.orderId, command.dto.tipAmount);

    this.#logger.debug(`Publishing OrderTipUpdatedEvent...`);
    this._eventBus.publish(new OrderTipUpdatedEvent(command.barId, command.orderId, command.dto.tipAmount));
  }
}
