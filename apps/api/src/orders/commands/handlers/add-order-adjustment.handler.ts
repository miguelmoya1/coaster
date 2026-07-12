import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersWriteRepository } from '../../data-access/orders.write.repository';
import { OrderAdjustmentsUpdatedEvent } from '../../events';
import { AddOrderAdjustmentCommand } from '../impl/add-order-adjustment.command';
import { OrdersMapper } from '../../mappers/orders.mapper';

@CommandHandler(AddOrderAdjustmentCommand)
export class AddOrderAdjustmentHandler implements ICommandHandler<AddOrderAdjustmentCommand, void> {
  readonly #logger = new Logger(AddOrderAdjustmentHandler.name);

  constructor(
    private readonly writeRepo: OrdersWriteRepository,
    private readonly readRepo: OrdersReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AddOrderAdjustmentCommand): Promise<void> {
    this.#logger.debug(`Executing addOrderAdjustment...`);

    const orderDb = await this.readRepo.findById(command.orderId);
    if (!orderDb || orderDb.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (command.dto.target === 'ITEM') {
      if (!command.dto.itemId) {
        throw new BadRequestException('itemId is required for ITEM target');
      }
      const itemExists = orderDb.items.some(i => i.id === command.dto.itemId);
      if (!itemExists) {
        throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
      }
    }

    // Domain Guard: Total cannot be negative
    const orderDomain = OrdersMapper.toDomain(orderDb as any); // map to compute current orderTotal
    
    // Simulate applying the new adjustment
    let simulatedDiscount = 0;
    if (command.dto.type === 'FIXED_AMOUNT') {
      simulatedDiscount = command.dto.value;
    } else if (command.dto.type === 'PERCENTAGE') {
      if (command.dto.target === 'ORDER') {
        simulatedDiscount = Math.round((orderDb.totalAmount * command.dto.value) / 100);
      } else if (command.dto.target === 'ITEM' && command.dto.itemId) {
        const item = orderDb.items.find(i => i.id === command.dto.itemId);
        if (item) {
          simulatedDiscount = Math.round(((item.priceAtPurchase * item.quantity) * command.dto.value) / 100);
        }
      }
    }

    if (orderDomain.orderTotal - simulatedDiscount < 0) {
      throw new BadRequestException('NEGATIVE_TOTAL_NOT_ALLOWED');
    }

    const updatedOrderDb = await this.writeRepo.addAdjustmentToOrder(command.orderId, command.dto);
    const updatedOrderDomain = OrdersMapper.toDomain(updatedOrderDb as any);

    this.#logger.debug(`Publishing OrderAdjustmentsUpdatedEvent...`);
    this._eventBus.publish(new OrderAdjustmentsUpdatedEvent(command.barId, command.orderId, updatedOrderDomain.adjustments));
  }
}
