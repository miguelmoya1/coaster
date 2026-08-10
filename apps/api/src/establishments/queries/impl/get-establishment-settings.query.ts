import type { EstablishmentId } from '@coaster/common';

export class GetEstablishmentSettingsQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
