import type { EstablishmentId, OrderId } from '@coaster/common';
import { AddOrderItemsDto } from '../../dto/add-order-items.dto';

export class AddOrderItemsCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: AddOrderItemsDto,
  ) {}
}
