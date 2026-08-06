import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan } from '@coaster/common';
import { BarSubscriptionRepository } from '../data-access/bar-subscription-repository';

@Service()
export class CreateCheckoutSession {
  readonly #subscriptionRepository = inject(BarSubscriptionRepository);

  public async execute(
    barId: BarId | undefined,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    const { url } = await this.#subscriptionRepository.createCheckoutSession(barId, {
      plan: plan === SubscriptionPlan.PRO ? plan : SubscriptionPlan.PRO,
    });
    return url;
  }
}
