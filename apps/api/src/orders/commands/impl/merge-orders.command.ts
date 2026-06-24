import type { BarId } from '@coaster/common';
import { MergeOrdersDto } from '../../dto/merge-orders.dto';

export class MergeOrdersCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: MergeOrdersDto,
  ) {}
}
