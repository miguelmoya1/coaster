import type { EstablishmentId, EstablishmentModule } from '@coaster/common';

export class UpdateEstablishmentSettingsCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly modules: EstablishmentModule[],
  ) {}
}
