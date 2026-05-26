import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { MoveOrderTableCommand } from './move-order-table.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { OrderTableMovedEvent } from '../../events';
import { asTableId, ErrorCodes, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(MoveOrderTableCommand)
export class MoveOrderTableHandler implements ICommandHandler<MoveOrderTableCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: MoveOrderTableCommand): Promise<Order> {
    const existingOrder = await this._ordersRepository.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const newTable = await this._ordersRepository.findTableById(asTableId(command.dto.tableId));
    if (!newTable || newTable.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }
    if (newTable.status === 'OCCUPIED') {
      throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
    }

    const order = await this._ordersRepository.moveTable(command.orderId, existingOrder.tableId, command.dto.tableId, newTable.name);
    const mapped = OrdersMapper.toDomain(order);
    this._eventBus.publish(
      new OrderTableMovedEvent(
        command.barId,
        mapped,
        existingOrder.tableId ? asTableId(existingOrder.tableId) : null,
        asTableId(command.dto.tableId),
      ),
    );

    return mapped;
  }
}
