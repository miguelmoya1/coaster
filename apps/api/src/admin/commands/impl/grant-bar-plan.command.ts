import type { BarId, GrantBarPlanDto, User } from '@coaster/common';

export class GrantBarPlanCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: GrantBarPlanDto,
    public readonly actor: User,
  ) {}
}
