import { BarId, MoveTableDto, OrderId } from '@coaster/common';

export class MoveOrderTableCommand {
  constructor(
    public readonly barId: BarId,
    public readonly orderId: OrderId,
    public readonly dto: MoveTableDto,
  ) {}
}
