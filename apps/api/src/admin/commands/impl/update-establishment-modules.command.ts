import type { EstablishmentId, EstablishmentModule, User } from '@coaster/common';

export class UpdateEstablishmentModulesCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly modules: EstablishmentModule[],
    public readonly actor: User,
  ) {}
}
