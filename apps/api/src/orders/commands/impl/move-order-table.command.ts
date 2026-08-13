import type { EstablishmentId, OrderId } from '@coaster/common';
import { MoveTableDto } from '../../dto/move-table.dto';

export class MoveOrderTableCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly orderId: OrderId,
    public readonly dto: MoveTableDto,
  ) {}
}
