import type { Order } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { OrdersReadRepository } from '../../data-access/orders.read.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { GetOrderByIdQuery } from '../impl/get-order-by-id.query';

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery, Order> {
  constructor(private readonly readRepo: OrdersReadRepository) {}

  async execute(query: GetOrderByIdQuery): Promise<Order> {
    const order = await this.readRepo.findById(query.orderId);

    if (!order || order.barId !== query.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    return OrdersMapper.toDomain(order);
  }
}
