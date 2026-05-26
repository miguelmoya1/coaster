import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { BulkUpdateOrderCommand } from './bulk-update-order.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { OrderUpdatedEvent } from '../../events';
import { ErrorCodes, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(BulkUpdateOrderCommand)
export class BulkUpdateOrderHandler implements ICommandHandler<BulkUpdateOrderCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: BulkUpdateOrderCommand): Promise<Order> {
    const order = await this._ordersRepository.findById(command.orderId);
    if (!order || order.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    for (const update of command.dto.items) {
      const item = order.items.find((i) => i.id === update.itemId);
      if (!item) {
        throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
      }

      if (update.paidQuantity !== undefined) {
        const newPaidQuantity = update.paidQuantity;
        if (newPaidQuantity > item.quantity) {
          throw new BadRequestException('PAY_QUANTITY_EXCEEDS_TOTAL');
        }
        if (newPaidQuantity < 0) {
          throw new BadRequestException('PAY_QUANTITY_CANNOT_BE_NEGATIVE');
        }
      }

      if (update.servedQuantity !== undefined) {
        const newServedQuantity = update.servedQuantity;
        if (newServedQuantity > item.quantity) {
          throw new BadRequestException('SERVE_QUANTITY_EXCEEDS_TOTAL');
        }
        if (newServedQuantity < 0) {
          throw new BadRequestException('SERVE_QUANTITY_CANNOT_BE_NEGATIVE');
        }
      }
    }

    const updated = await this._ordersRepository.bulkUpdate(command.orderId, command.dto.items);
    if (!updated) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    const mapped = OrdersMapper.toDomain(updated);
    this._eventBus.publish(new OrderUpdatedEvent(command.barId, mapped));
    return mapped;
  }
}
