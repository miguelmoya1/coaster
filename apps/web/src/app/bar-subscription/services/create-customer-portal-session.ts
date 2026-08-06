import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarSubscriptionRepository } from '../data-access/bar-subscription-repository';

@Service()
export class CreateCustomerPortalSession {
  readonly #subscriptionRepository = inject(BarSubscriptionRepository);

  public async execute(barId: BarId | undefined): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    const { url } = await this.#subscriptionRepository.createCustomerPortalSession(barId, {});
    return url;
  }
}
