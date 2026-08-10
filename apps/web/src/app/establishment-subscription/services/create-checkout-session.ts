import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { SubscriptionPlan } from '@coaster/common';
import { EstablishmentSubscriptionRepository } from '../data-access/establishment-subscription-repository';

@Service()
export class CreateCheckoutSession {
  readonly #subscriptionRepository = inject(EstablishmentSubscriptionRepository);

  public async execute(
    establishmentId: EstablishmentId | undefined,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    if (!establishmentId) {
      return undefined;
    }

    const { url } = await this.#subscriptionRepository.createCheckoutSession(establishmentId, {
      plan: plan === SubscriptionPlan.PRO ? plan : SubscriptionPlan.PRO,
    });
    return url;
  }
}
