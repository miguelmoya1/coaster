import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CreateCheckoutSession {
  readonly #barRepository = inject(BarRepository);

  public async execute(barId: BarId | undefined, returnUrl: string): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    const currentPath = window.location.pathname + window.location.search;
    try {
      const { url } = await this.#barRepository.createCheckoutSession(barId, {
        plan: SubscriptionPlan.PRO_MONTHLY,
        successUrl: returnUrl,
        cancelUrl: window.location.origin + currentPath,
      });
      return url;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
