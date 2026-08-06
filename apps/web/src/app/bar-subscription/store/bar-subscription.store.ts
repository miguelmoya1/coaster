import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Socket } from '@coaster/core';
import { barSubscriptionMapper } from '../mappers/bar-subscription.mapper';
import { BarSubscription } from '../services/bar-subscription';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';

export const BillingAction = {
  ACTIVATE: 'ACTIVATE',
  MANAGE: 'MANAGE',
} as const;

export type BillingAction = (typeof BillingAction)[keyof typeof BillingAction];

@Service()
export class BarSubscriptionStore {
  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #isOpeningBillingPortal = signal(false);
  readonly #barSubscription = inject(BarSubscription);
  readonly #createCustomerPortalSession = inject(CreateCustomerPortalSession);
  readonly #createCheckoutSession = inject(CreateCheckoutSession);
  readonly #socketService = inject(Socket);

  readonly #subscriptionResource = httpResource(
    () => {
      return this.#barSubscription.execute(this.#currentBarId());
    },
    {
      parse: (subscription) => barSubscriptionMapper(subscription),
    },
  );

  public readonly subscription = this.#subscriptionResource.asReadonly();

  readonly #currentSubscription = computed(() =>
    this.#subscriptionResource.hasValue() ? this.#subscriptionResource.value() : undefined,
  );
  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly isOpeningBillingPortal = this.#isOpeningBillingPortal.asReadonly();

  public readonly isReadOnly = computed(() => {
    const sub = this.#currentSubscription();

    if (!sub) {
      const status = this.#subscriptionResource.status();
      return status !== 'loading' && status !== 'reloading' && status !== 'idle';
    }

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
    const sub = this.#currentSubscription();
    if (!sub || sub.status !== SubscriptionStatus.TRIALING || !sub.trialEndsAt) {
      return 0;
    }
    const diffMs = new Date(sub.trialEndsAt).getTime() - new Date().getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  });

  public readonly isTrialActive = computed(() => {
    const sub = this.#currentSubscription();
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
    const subscription = this.#currentSubscription();

    return subscription?.stripeSubscriptionId && !this.isReadOnly() ? BillingAction.MANAGE : BillingAction.ACTIVATE;
  });

  public readonly showBillingAction = computed(() => !this.showSubscriptionBanner());

  constructor() {
    effect(() => {
      const event = this.#socketService.subscriptionUpdated();
      const currentBarId = this.#currentBarId();
      if (event && (!event.barId || event.barId === currentBarId)) {
        this.reloadSubscription();
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadSubscription() {
    this.#subscriptionResource.reload();
  }

  public async createCustomerPortalSession(): Promise<string | undefined> {
    if (this.#isOpeningBillingPortal()) {
      return undefined;
    }

    this.#isOpeningBillingPortal.set(true);

    try {
      const portalUrl = await this.#createCustomerPortalSession.execute(this.#currentBarId());

      if (!portalUrl) {
        this.#isOpeningBillingPortal.set(false);
      }

      return portalUrl;
    } catch (error) {
      this.#isOpeningBillingPortal.set(false);
      throw error;
    }
  }

  public async createCheckoutSession(
    barId: BarId,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    return this.#createCheckoutSession.execute(barId, plan);
  }
}
