import type { EstablishmentId, RevokeEstablishmentPlanDto, User } from '@coaster/common';

export class RevokeEstablishmentPlanCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: RevokeEstablishmentPlanDto,
    public readonly actor: User,
  ) {}
}
