import type { Order } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { GetOrdersByBarIdQuery } from '../impl/get-orders-by-bar-id.query';

@QueryHandler(GetOrdersByBarIdQuery)
export class GetOrdersByBarIdHandler implements IQueryHandler<GetOrdersByBarIdQuery, Order[]> {
  constructor(private readonly readRepo: OrdersReadRepository) {}

  async execute(query: GetOrdersByBarIdQuery): Promise<Order[]> {
    const orders = await this.readRepo.findByBarId(query.barId, query.status);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }
}
