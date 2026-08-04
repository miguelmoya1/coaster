import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CreateCheckoutSession {
  readonly #barRepository = inject(BarRepository);

  public async execute(
    barId: BarId | undefined,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    const { url } = await this.#barRepository.createCheckoutSession(barId, {
      plan: plan === SubscriptionPlan.PRO ? plan : SubscriptionPlan.PRO,
    });
    return url;
  }
}
