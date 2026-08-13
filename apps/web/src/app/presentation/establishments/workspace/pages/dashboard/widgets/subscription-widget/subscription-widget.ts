import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { BillingAction, EstablishmentSubscriptionStore, PlanDialogService } from '@coaster/establishment-subscription';
import { ActionFeedback, ApiError } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Spinner } from '../../../../../../components/spinner/spinner';

@Component({
  selector: 'coaster-subscription-widget',
  imports: [TranslatePipe, MatIcon, MatButton, MatCard, Spinner],
  host: { class: 'block' },
  templateUrl: './subscription-widget.html',
})
export class SubscriptionWidget {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #establishmentSubscriptionStore = inject(EstablishmentSubscriptionStore);
  readonly #planDialogService = inject(PlanDialogService);
  readonly #actionFeedback = inject(ActionFeedback);

  readonly subscription = computed(() => this.#establishmentSubscriptionStore.subscription.value());
  readonly billingAction = this.#establishmentSubscriptionStore.billingAction;
  readonly isOpeningBillingPortal = this.#establishmentSubscriptionStore.isOpeningBillingPortal;
  readonly showBillingAction = this.#establishmentSubscriptionStore.showBillingAction;
  readonly BillingAction = BillingAction;

  readonly planLabelKey = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.plan === 'FREE') return 'billing.plan_name.free';
    return 'billing.plan_name.pro';
  });

  readonly isPendingCancel = computed(() => {
    const sub = this.subscription();
    if (!sub) return false;
    if (sub.status === 'CANCELED') {
      if (!sub.currentPeriodEnd) return true;
      return new Date() <= new Date(sub.currentPeriodEnd);
    }
    return false;
  });

  readonly statusLabelKey = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'billing.status.free';
    if (this.isPendingCancel()) {
      return 'billing.status.cancel_at_period_end';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'billing.status.active';
      case 'TRIALING':
        return 'billing.status.trialing';
      case 'PAST_DUE':
        return 'billing.status.past_due';
      case 'CANCELED':
        return 'billing.status.canceled';
      case 'UNPAID':
        return 'billing.status.unpaid';
      default:
        return 'billing.status.inactive';
    }
  });

  readonly periodInfoKey = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    if (this.isPendingCancel()) {
      return 'billing.cancels_on';
    }
    if (sub.status === 'ACTIVE') {
      return 'billing.renews_on';
    }
    return null;
  });

  readonly formattedPeriodEnd = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    return new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly statusIconContainerClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'bg-surface-container-highest text-on-surface-variant';
    if (this.isPendingCancel()) {
      return 'bg-secondary/15 text-secondary';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-500';
      case 'TRIALING':
        return 'bg-sky-400/15 text-sky-400';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'bg-secondary/15 text-secondary';
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  });

  readonly statusBadgeStyleClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'text-on-surface-variant bg-surface-container border-outline-variant/30';
    if (this.isPendingCancel()) {
      return 'text-secondary bg-secondary/10 border-secondary/20';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'TRIALING':
        return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'text-secondary bg-secondary/10 border-secondary/20';
      default:
        return 'text-on-surface-variant bg-surface-container border-outline-variant/30';
    }
  });

  async manageBilling(): Promise<void> {
    if (this.isOpeningBillingPortal()) {
      return;
    }

    try {
      const portalUrl = await this.#establishmentSubscriptionStore.createCustomerPortalSession();
      if (portalUrl) {
        window.location.assign(portalUrl);
      } else {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    }
  }

  activatePro(): void {
    this.#planDialogService.open(this.establishmentId());
  }
}
