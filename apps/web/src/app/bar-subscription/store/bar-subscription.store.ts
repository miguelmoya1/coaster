import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service } from '@angular/core';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import type { BarId } from '@coaster/common';
import { Socket } from '@coaster/core';
import { barSubscriptionMapper } from '../mappers/bar-subscription.mapper';
import { BarSubscription } from '../services/bar-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { CurrentBarStore } from '@coaster/bars';

export const BillingAction = {
  ACTIVATE: 'ACTIVATE',
  MANAGE: 'MANAGE',
} as const;

export type BillingAction = (typeof BillingAction)[keyof typeof BillingAction];

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

  public readonly isReadOnly = computed(() => {
    const sub = this.subscription.value();
    if (!sub) return false;
    if (sub.status === SubscriptionStatus.ACTIVE) {
      return !(sub.stripeSubscriptionId && sub.currentPeriodEnd && new Date() <= new Date(sub.currentPeriodEnd));
    }
    if (sub.status === SubscriptionStatus.CANCELED) {
      if (!sub.currentPeriodEnd) return true;
      return new Date() > new Date(sub.currentPeriodEnd);
    }
    if (
      sub.status === SubscriptionStatus.EXPIRED ||
      sub.status === SubscriptionStatus.PAST_DUE ||
      sub.status === SubscriptionStatus.UNPAID ||
      sub.status === SubscriptionStatus.INACTIVE
    ) {
      return true;
    }
    if (sub.status === SubscriptionStatus.TRIALING) {
      return !(sub.trialEndsAt && new Date() <= new Date(sub.trialEndsAt));
    }
    return false;
  });

  public readonly trialDaysRemaining = computed(() => {
    const sub = this.subscription.value();
    if (!sub || sub.status !== SubscriptionStatus.TRIALING || !sub.trialEndsAt) {
      return 0;
    }
    const diffMs = new Date(sub.trialEndsAt).getTime() - new Date().getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  });

  public readonly isTrialActive = computed(() => {
    const sub = this.subscription.value();
    if (!sub) return false;
    if (sub.status !== SubscriptionStatus.TRIALING) return false;
    if (!sub.trialEndsAt) return true;
    return new Date() <= new Date(sub.trialEndsAt);
  });

  public readonly isTrialExpiringSoon = computed(() => {
    return this.isTrialActive() && this.trialDaysRemaining() <= 3;
  });

  public readonly showSubscriptionBanner = computed(() => {
    return this.isReadOnly() || this.isTrialExpiringSoon();
  });

  public readonly billingAction = computed<BillingAction>(() => {
    if (this.showSubscriptionBanner()) {
      return BillingAction.ACTIVATE;
    }

    return this.subscription.value()?.status === SubscriptionStatus.ACTIVE
      ? BillingAction.MANAGE
      : BillingAction.ACTIVATE;
  });

  public readonly showBillingAction = computed(() => !this.showSubscriptionBanner());

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

  public async createCustomerPortalSession(): Promise<string | undefined> {
    return this.#createCustomerPortalSession.execute(this.#currentBarStore.currentId());
  }

  public async createCheckoutSession(
    barId: BarId,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    return this.#createCheckoutSession.execute(barId, plan);
  }
}
