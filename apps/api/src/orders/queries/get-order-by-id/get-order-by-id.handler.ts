import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderByIdQuery } from './get-order-by-id.query';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { Order, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';

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
