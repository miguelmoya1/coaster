import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MergeOrdersCommand } from './merge-orders.command';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { BarGateway } from '../../../core';
import { asOrderId, asTableId, ErrorCodes, SocketEvents, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@CommandHandler(MergeOrdersCommand)
export class MergeOrdersHandler implements ICommandHandler<MergeOrdersCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: MergeOrdersCommand): Promise<Order> {
    const orders = await this._ordersRepository.findOrdersByIds(command.dto.orderIds);
    if (orders.length !== command.dto.orderIds.length) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonBarOrders = orders.filter((o) => o.barId !== command.barId);
    if (nonBarOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonOpenOrders = orders.filter((o) => o.status !== 'OPEN');
    if (nonOpenOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    if (command.dto.targetTableId) {
      const targetTable = await this._ordersRepository.findTableById(asTableId(command.dto.targetTableId));
      if (!targetTable || targetTable.barId !== command.barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
    }

    const [primaryOrder, ...sourceOrders] = orders;
    const sourceOrdersData = sourceOrders.map((o) => ({ id: asOrderId(o.id), tableId: o.tableId }));

    const result = await this._ordersRepository.mergeOrders(
      asOrderId(primaryOrder.id),
      sourceOrdersData,
      command.dto.targetTableId ?? null,
      primaryOrder.tableId,
      primaryOrder.tableName,
    );

    const mapped = OrdersMapper.toDomain(result);
    this._barGateway.server.to(command.barId).emit(SocketEvents.ORDER_UPDATED, mapped);

    for (const source of sourceOrders) {
      this._barGateway.server.to(command.barId).emit(SocketEvents.ORDER_CANCELLED, { id: source.id });
      if (source.tableId) {
        this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: source.tableId,
          status: 'FREE',
        });
      }
    }

    return mapped;
  }
}
