import type { EstablishmentId } from '@coaster/common';

export class EstablishmentSettingsUpdatedEvent {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
