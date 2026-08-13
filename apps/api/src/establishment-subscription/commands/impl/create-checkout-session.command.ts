import type { EstablishmentId, SubscriptionPlan } from '@coaster/common';

export class CreateCheckoutSessionCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly plan: Exclude<SubscriptionPlan, 'FREE'>,
  ) {}
}
