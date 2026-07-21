import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { SubscriptionPlan } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';
import { barSubscriptionMapper } from '../mappers/bar.mapper';
import { CurrentBarStore } from './current-bar.store';

@Service()
export class BarSubscriptionStore {
  readonly #barRepository = inject(BarRepository);
  readonly #currentBarStore = inject(CurrentBarStore);

  readonly #subscriptionResource = httpResource(
    () => {
      const barId = this.#currentBarStore.currentId();
      if (!barId) {
        return undefined;
      }
      return this.#barRepository.routes.getSubscription(barId);
    },
    {
      parse: (subscription) => barSubscriptionMapper(subscription),
    },
  );

  public readonly subscription = this.#subscriptionResource.asReadonly();

  public reloadSubscription() {
    this.#subscriptionResource.reload();
  }

  public async createCustomerPortalSession(returnUrl: string): Promise<string | undefined> {
    const barId = this.#currentBarStore.currentId();

    if (!barId) {
      return undefined;
    }

    try {
      const { url } = await this.#barRepository.createCustomerPortalSession(barId, { returnUrl });
      return url;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  public async createCheckoutSession(returnUrl: string): Promise<string | undefined> {
    const barId = this.#currentBarStore.currentId();

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
