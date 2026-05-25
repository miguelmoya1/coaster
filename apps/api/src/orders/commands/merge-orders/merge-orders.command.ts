import { BarId, MergeOrdersDto } from '@coaster/common';

export class MergeOrdersCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: MergeOrdersDto,
  ) {}
}
