import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentSubscriptionRepository } from '../data-access/establishment-subscription-repository';

@Service()
export class EstablishmentSubscription {
  readonly #subscriptionRepository = inject(EstablishmentSubscriptionRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#subscriptionRepository.routes.getSubscription(establishmentId);
  }
}
