import type { BarId, RevokeBarPlanDto, User } from '@coaster/common';

export class RevokeBarPlanCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: RevokeBarPlanDto,
    public readonly actor: User,
  ) {}
}
