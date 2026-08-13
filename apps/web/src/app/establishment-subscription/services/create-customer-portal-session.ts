import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentSubscriptionRepository } from '../data-access/establishment-subscription-repository';

@Service()
export class CreateCustomerPortalSession {
  readonly #subscriptionRepository = inject(EstablishmentSubscriptionRepository);

  public async execute(establishmentId: EstablishmentId | undefined): Promise<string | undefined> {
    if (!establishmentId) {
      return undefined;
    }

    const { url } = await this.#subscriptionRepository.createCustomerPortalSession(establishmentId, {});
    return url;
  }
}
