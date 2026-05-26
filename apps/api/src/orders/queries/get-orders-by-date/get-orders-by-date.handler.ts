import { Order } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { GetOrdersByDateQuery } from './get-orders-by-date.query';

@QueryHandler(GetOrdersByDateQuery)
export class GetOrdersByDateHandler implements IQueryHandler<GetOrdersByDateQuery, Order[]> {
  constructor(private readonly _ordersRepository: OrdersRepository) {}

  async execute(query: GetOrdersByDateQuery): Promise<Order[]> {
    const orders = await this._ordersRepository.findByBarIdAndDate(query.barId, query.date);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }
}
