import type { EstablishmentId, GrantEstablishmentPlanDto, User } from '@coaster/common';

export class GrantEstablishmentPlanCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: GrantEstablishmentPlanDto,
    public readonly actor: User,
  ) {}
}
