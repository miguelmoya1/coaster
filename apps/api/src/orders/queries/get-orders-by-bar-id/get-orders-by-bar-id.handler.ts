import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrdersByBarIdQuery } from './get-orders-by-bar-id.query';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { Order } from '@coaster/common';

@QueryHandler(GetOrdersByBarIdQuery)
export class GetOrdersByBarIdHandler implements IQueryHandler<GetOrdersByBarIdQuery, Order[]> {
  constructor(private readonly _ordersRepository: OrdersRepository) {}

  async execute(query: GetOrdersByBarIdQuery): Promise<Order[]> {
    const orders = await this._ordersRepository.findByBarId(query.barId, query.status);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }
}
