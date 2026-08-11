import type { EstablishmentId } from '@coaster/common';

export class GetMenuDraftQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
