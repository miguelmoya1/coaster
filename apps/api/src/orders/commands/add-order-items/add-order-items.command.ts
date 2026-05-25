import { AddOrderItemsDto, BarId, OrderId } from '@coaster/common';

export class AddOrderItemsCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: AddOrderItemsDto,
  ) {}
}
