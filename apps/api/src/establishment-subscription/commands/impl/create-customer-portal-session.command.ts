import type { EstablishmentId } from '@coaster/common';

export class CreateCustomerPortalSessionCommand {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
