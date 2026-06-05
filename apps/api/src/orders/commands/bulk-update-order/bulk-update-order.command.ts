import type { BarId, OrderId } from '@coaster/common';
import { BulkUpdateDto } from '../../dto/bulk-update.dto';

export class BulkUpdateOrderCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: BulkUpdateDto,
  ) {}
}
