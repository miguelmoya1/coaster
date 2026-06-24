import type { BarId, OrderId } from '@coaster/common';
import { AddOrderItemsDto } from '../../dto/add-order-items.dto';

export class AddOrderItemsCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: AddOrderItemsDto,
  ) {}
}
