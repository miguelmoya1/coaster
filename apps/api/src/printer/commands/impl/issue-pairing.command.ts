import type { EstablishmentId } from '@coaster/common';

export class IssuePairingCommand {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
