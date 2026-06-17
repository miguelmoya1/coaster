import type { BarId, OrderId } from '@coaster/common';
import { MoveTableDto } from '../../dto/move-table.dto';

export class MoveOrderTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: MoveTableDto,
  ) {}
}
