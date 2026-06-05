import type { Order } from '@coaster/common';
import { ErrorCodes } from '../../../core';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { GetOrderByIdQuery } from './get-order-by-id.query';

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery, Order> {
  constructor(private readonly _ordersRepository: OrdersRepository) {}

  async execute(query: GetOrderByIdQuery): Promise<Order> {
    const order = await this._ordersRepository.findById(query.orderId);
    if (!order || order.barId !== query.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    return OrdersMapper.toDomain(order);
  }
}
