import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarSubscriptionRepository } from '../data-access/bar-subscription-repository';

@Service()
export class BarSubscription {
  readonly #subscriptionRepository = inject(BarSubscriptionRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#subscriptionRepository.routes.getSubscription(barId);
  }
}
