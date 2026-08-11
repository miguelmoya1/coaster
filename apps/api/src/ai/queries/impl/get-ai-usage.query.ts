import type { EstablishmentId } from '@coaster/common';

export class GetAiUsageQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
