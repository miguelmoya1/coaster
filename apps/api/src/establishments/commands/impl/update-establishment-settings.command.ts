import type { EstablishmentId, EstablishmentModule, Language } from '@coaster/common';

export class UpdateEstablishmentSettingsCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly modules: EstablishmentModule[],
    public readonly language?: Language,
  ) {}
}
