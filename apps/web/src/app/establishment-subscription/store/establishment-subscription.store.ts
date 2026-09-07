import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { EstablishmentId, SubscriptionSeats as SubscriptionSeatsInfo } from '@coaster/common';
import { SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { establishmentSubscriptionMapper } from '../mappers/establishment-subscription.mapper';
import { CreateCheckoutSession } from '../services/create-checkout-session';
import { CreateCustomerPortalSession } from '../services/create-customer-portal-session';
import { EstablishmentSubscription } from '../services/establishment-subscription';
import { SubscriptionSeats } from '../services/subscription-seats';

export const BillingAction = {
  ACTIVATE: 'ACTIVATE',
  MANAGE: 'MANAGE',
} as const;

export type BillingAction = (typeof BillingAction)[keyof typeof BillingAction];

@Service()
export class EstablishmentSubscriptionStore {
  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);
  readonly #isOpeningBillingPortal = signal(false);
  readonly #establishmentSubscription = inject(EstablishmentSubscription);
  readonly #subscriptionSeats = inject(SubscriptionSeats);
  readonly #createCustomerPortalSession = inject(CreateCustomerPortalSession);
  readonly #createCheckoutSession = inject(CreateCheckoutSession);
  readonly #realtime = inject(Realtime);

  readonly #subscriptionResource = httpResource(
    () => {
      return this.#establishmentSubscription.execute(this.#currentEstablishmentId());
    },
    {
      parse: (subscription) => establishmentSubscriptionMapper(subscription),
    },
  );

  readonly #seatsResource = httpResource<SubscriptionSeatsInfo>(() =>
    this.#subscriptionSeats.execute(this.#currentEstablishmentId()),
  );

  public readonly subscription = this.#subscriptionResource.asReadonly();
  public readonly seats = this.#seatsResource.asReadonly();

  readonly #currentSeats = computed(() => (this.#seatsResource.hasValue() ? this.#seatsResource.value() : undefined));

  public readonly seatSummary = computed(() => {
    const seats = this.#currentSeats();
    const isPriced = [seats?.used, seats?.included, seats?.basePriceCents, seats?.extraPriceCents].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    );

    if (!seats || !isPriced) {
      return undefined;
    }

    const extraSeats = Math.max(0, seats.used - seats.included);

    return {
      ...seats,
      extraSeats,
      monthlyTotalCents: seats.basePriceCents + extraSeats * seats.extraPriceCents,
    };
  });

  readonly #currentSubscription = computed(() =>
    this.#subscriptionResource.hasValue() ? this.#subscriptionResource.value() : undefined,
  );

  public readonly billedSeats = computed(() =>
    this.#currentSubscription()?.stripeSubscriptionId ? this.seatSummary() : undefined,
  );

  public readonly extraSeatNotice = computed(() => {
    const seats = this.billedSeats();

    return seats && seats.used >= seats.included ? seats : undefined;
  });

  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
  public readonly isOpeningBillingPortal = this.#isOpeningBillingPortal.asReadonly();

  public readonly isReadOnly = computed(() => {
    const sub = this.#currentSubscription();

    if (!sub) {
      return false;
    }

    if (sub.manualGrant) {
      return false;
    }

    if (sub.status === SubscriptionStatus.ACTIVE) {
      return !(sub.stripeSubscriptionId && sub.currentPeriodEnd && new Date() <= new Date(sub.currentPeriodEnd));
    }
    if (sub.status === SubscriptionStatus.CANCELED) {
      if (!sub.currentPeriodEnd) return true;
      return new Date() > new Date(sub.currentPeriodEnd);
    }
    if (sub.status === SubscriptionStatus.PAST_DUE) {
      return false;
    }

    if (
      sub.status === SubscriptionStatus.EXPIRED ||
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

  public readonly paymentNeedsAttention = computed(
    () => this.#currentSubscription()?.status === SubscriptionStatus.PAST_DUE,
  );

  public readonly showSubscriptionBanner = computed(() => {
    return this.isReadOnly() || this.paymentNeedsAttention() || this.isTrialExpiringSoon();
  });

  public readonly isPendingCancellation = computed(() => {
    const sub = this.#currentSubscription();

    if (sub?.status !== SubscriptionStatus.CANCELED || !sub.currentPeriodEnd) {
      return false;
    }

    return new Date() <= new Date(sub.currentPeriodEnd);
  });

  public readonly billingAction = computed<BillingAction>(() => {
    if (this.isPendingCancellation()) {
      return BillingAction.MANAGE;
    }

    return this.#currentSubscription()?.stripeSubscriptionId ? BillingAction.MANAGE : BillingAction.ACTIVATE;
  });

  constructor() {
    effect(() => {
      const event = this.#realtime.subscriptionUpdated();
      const currentEstablishmentId = this.#currentEstablishmentId();
      if (event && (!event.establishmentId || event.establishmentId === currentEstablishmentId)) {
        this.reloadSubscription();
      }
    });

    effect(() => {
      if (this.#realtime.memberInvited() || this.#realtime.memberRemoved()) {
        this.reloadSeats();
      }
    });
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reloadSubscription() {
    this.#subscriptionResource.reload();
  }

  public reloadSeats() {
    this.#seatsResource.reload();
  }

  public async createCustomerPortalSession(): Promise<string | undefined> {
    if (this.#isOpeningBillingPortal()) {
      return undefined;
    }

    this.#isOpeningBillingPortal.set(true);

    try {
      const portalUrl = await this.#createCustomerPortalSession.execute(this.#currentEstablishmentId());

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
    establishmentId: EstablishmentId,
    plan: Exclude<SubscriptionPlan, 'FREE'> = SubscriptionPlan.PRO,
  ): Promise<string | undefined> {
    return this.#createCheckoutSession.execute(establishmentId, plan);
  }
}
