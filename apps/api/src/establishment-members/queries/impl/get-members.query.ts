import type { EstablishmentId } from '@coaster/common';

export class GetMembersQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
