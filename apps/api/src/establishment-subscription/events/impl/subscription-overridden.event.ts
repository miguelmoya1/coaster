import type { EstablishmentId } from '@coaster/common';

export class SubscriptionOverriddenEvent {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
