import type { Order } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { GetOrdersByEstablishmentIdQuery } from '../impl/get-orders-by-establishment-id.query';

@QueryHandler(GetOrdersByEstablishmentIdQuery)
export class GetOrdersByEstablishmentIdHandler implements IQueryHandler<GetOrdersByEstablishmentIdQuery, Order[]> {
  constructor(private readonly readRepo: OrdersReadRepository) {}

  async execute(query: GetOrdersByEstablishmentIdQuery): Promise<Order[]> {
    const orders = await this.readRepo.findByEstablishmentId(query.establishmentId, query.status);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }
}
