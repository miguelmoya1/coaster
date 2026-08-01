import { httpResource } from '@angular/common/http';
import { effect, inject, Service } from '@angular/core';
import { SubscriptionPlan } from '@coaster/common';
import { Socket } from '@coaster/core';
import { barSubscriptionMapper } from '../mappers/bar.mapper';
import { BarSubscription } from '../services/bar-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { CurrentBarStore } from './current-bar.store';

@Service()
export class BarSubscriptionStore {
  readonly #currentBarStore = inject(CurrentBarStore);
  readonly #barSubscription = inject(BarSubscription);
  readonly #createCustomerPortalSession = inject(CreateCustomerPortalSession);
  readonly #createCheckoutSession = inject(CreateCheckoutSession);
  readonly #socketService = inject(Socket);

  readonly #subscriptionResource = httpResource(
    () => {
      return this.#barSubscription.execute(this.#currentBarStore.currentId());
    },
    {
      parse: (subscription) => barSubscriptionMapper(subscription),
    },
  );

  public readonly subscription = this.#subscriptionResource.asReadonly();

  constructor() {
    effect(() => {
      const event = this.#socketService.subscriptionUpdated();
      const currentBarId = this.#currentBarStore.currentId();
      if (event && (!event.barId || event.barId === currentBarId)) {
        this.reloadSubscription();
      }
    });
  }

  public reloadSubscription() {
    this.#subscriptionResource.reload();
  }

  public async createCustomerPortalSession(returnUrl: string): Promise<string | undefined> {
    return this.#createCustomerPortalSession.execute(this.#currentBarStore.currentId(), returnUrl);
  }

  public async createCheckoutSession(
    returnUrl: string,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO_MONTHLY,
  ): Promise<string | undefined> {
    return this.#createCheckoutSession.execute(this.#currentBarStore.currentId(), returnUrl, plan);
  }
}
