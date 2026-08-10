import type { EstablishmentId, OrderId } from '@coaster/common';
import { BulkUpdateDto } from '../../dto/bulk-update.dto';

export class BulkUpdateOrderCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: BulkUpdateDto,
  ) {}
}
