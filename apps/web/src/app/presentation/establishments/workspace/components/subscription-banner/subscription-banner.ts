import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EstablishmentPermission, type EstablishmentId } from '@coaster/common';
import { MyMemberStore } from '@coaster/establishment-members';
import { BillingAction, BillingEntryPoint, EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-subscription-banner',
  imports: [MatButton, MatIcon, TranslatePipe],
  template: `
    @if (subStore.showSubscriptionBanner()) {
      @if (subStore.isReadOnly()) {
        <div class="flex items-center gap-2.5 min-w-0">
          <mat-icon class="text-secondary shrink-0 text-base sm:text-lg">lock</mat-icon>
          <span class="truncate sm:whitespace-normal">
            {{ (canManageBilling() ? 'billing.banner.read_only' : 'billing.banner.read_only_staff') | translate }}
          </span>
        </div>
        @if (!canManageBilling()) {
        } @else if (subStore.billingAction() === BillingAction.ACTIVATE) {
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="rounded-xl! text-xs! shrink-0"
            (click)="openBilling()"
          >
            {{ 'billing.banner.activate_pro' | translate }}
          </button>
        } @else {
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="rounded-xl! text-xs! shrink-0"
            [disabled]="subStore.isOpeningBillingPortal()"
            (click)="openBilling()"
          >
            {{ 'billing.manage_billing' | translate }}
          </button>
        }
      } @else if (subStore.paymentNeedsAttention()) {
        <div class="flex items-center gap-2.5 min-w-0">
          <mat-icon class="text-secondary shrink-0 text-base sm:text-lg">credit_card_off</mat-icon>
          <span class="truncate sm:whitespace-normal">{{ 'billing.banner.payment_failed' | translate }}</span>
        </div>
        @if (canManageBilling()) {
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="rounded-xl! text-xs! shrink-0"
            [disabled]="subStore.isOpeningBillingPortal()"
            (click)="openBilling()"
          >
            {{ 'billing.banner.update_card' | translate }}
          </button>
        }
      } @else {
        <div class="flex items-center gap-2.5 min-w-0">
          <mat-icon class="text-primary shrink-0 text-base sm:text-lg">timer</mat-icon>
          <span class="truncate sm:whitespace-normal">
            @if (subStore.trialDaysRemaining() === 1) {
              {{ 'billing.banner.trial_expiring_one' | translate }}
            } @else {
              {{ 'billing.banner.trial_expiring_other' | translate: { days: subStore.trialDaysRemaining() } }}
            }
          </span>
        </div>
        <button
          type="button"
          mat-stroked-button
          class="rounded-xl! text-xs! shrink-0"
          (click)="openBilling()"
        >
          {{ 'billing.banner.view_plans' | translate }}
        </button>
      }
    }
  `,
  host: {
    '[class.hidden]': '!subStore.showSubscriptionBanner()',
    '[class.bg-secondary/10]': 'subStore.isReadOnly() || subStore.paymentNeedsAttention()',
    '[class.border-secondary/20]': 'subStore.isReadOnly() || subStore.paymentNeedsAttention()',
    '[class.bg-primary/10]':
      '!subStore.isReadOnly() && !subStore.paymentNeedsAttention() && subStore.isTrialExpiringSoon()',
    '[class.border-primary/20]':
      '!subStore.isReadOnly() && !subStore.paymentNeedsAttention() && subStore.isTrialExpiringSoon()',
    class:
      'flex items-center justify-between gap-3 sm:gap-4 mx-4 sm:mx-6 my-2 px-4 py-2.5 rounded-xl border text-on-surface text-xs sm:text-sm font-medium transition-all animate-in fade-in duration-300',
  },
})
export class SubscriptionBanner {
  readonly establishmentId = input.required<EstablishmentId>();
  protected readonly subStore = inject(EstablishmentSubscriptionStore);
  readonly #billingEntryPoint = inject(BillingEntryPoint);
  protected readonly BillingAction = BillingAction;
  readonly #myMemberStore = inject(MyMemberStore);

  protected openBilling(): void {
    this.#billingEntryPoint.open(this.establishmentId());
  }

  protected readonly canManageBilling = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING),
  );
}
