import { Component, computed, inject, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SubscriptionPlan } from '@coaster/common';
import { MoneyFormatterService } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EstablishmentSubscriptionStore } from '../../store/establishment-subscription.store';

@Component({
  selector: 'coaster-select-plan-dialog',
  imports: [
    MatProgressSpinner,
    MatButton,
    MatIcon,
    TranslatePipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-3 m-0 p-0 text-xl font-bold text-on-surface">
      <span class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <mat-icon class="text-xl">rocket_launch</mat-icon>
      </span>
      {{ 'billing.activate_pro_title' | translate }}
    </h2>

    <mat-dialog-content>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ 'billing.activate_pro_subtitle' | translate }}
      </p>

      <section class="flex flex-col p-5 rounded-2xl border-2 border-primary bg-primary/5">
        <header class="flex items-center justify-between mb-2">
          <span class="font-bold text-base text-on-surface">
            {{ 'billing.monthly_title' | translate }}
          </span>
          <mat-icon class="text-primary text-xl shrink-0">check_circle</mat-icon>
        </header>

        <p class="text-xs text-on-surface-variant mb-4">
          {{ 'billing.monthly_subtitle' | translate }}
        </p>

        @if (seats(); as summary) {
          <dl class="flex flex-col gap-1 mb-4 pb-4 border-b border-outline-variant">
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-sm text-on-surface-variant">
                {{ 'billing.seats.your_staff' | translate: { count: summary.used } }}
              </dt>
              <dd class="text-2xl font-black tabular-nums text-primary m-0">{{ summary.monthlyTotal }}</dd>
            </div>

            <p class="text-xs text-on-surface-variant m-0">
              @if (summary.extraSeats > 0) {
                {{
                  'billing.seats.breakdown_over'
                    | translate
                      : {
                          base: summary.basePrice,
                          included: summary.included,
                          extra: summary.extraSeats,
                          each: summary.extraPrice,
                        }
                }}
              } @else {
                {{
                  'billing.seats.breakdown_within'
                    | translate: { included: summary.included, each: summary.extraPrice }
                }}
              }
            </p>

            <p class="text-xs text-on-surface-variant m-0">{{ 'billing.seats.tax_note' | translate }}</p>
          </dl>
        }

        <ul class="text-xs text-on-surface-variant space-y-2 mt-auto">
          <li class="flex items-center gap-2">
            <mat-icon class="text-emerald-500 text-sm shrink-0">check</mat-icon>
            <span>{{ 'billing.monthly_feat_1' | translate }}</span>
          </li>
          <li class="flex items-center gap-2">
            <mat-icon class="text-emerald-500 text-sm shrink-0">check</mat-icon>
            <span>{{ 'billing.monthly_feat_2' | translate }}</span>
          </li>
        </ul>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
      <button mat-button [disabled]="loading()" (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
        class="gap-2 whitespace-nowrap"
        (click)="selected.emit(SubscriptionPlan.PRO)"
      >
        @if (loading()) {
          <mat-progress-spinner mode="indeterminate" [diameter]="18" [strokeWidth]="2" />
        }
        {{ 'billing.continue_to_checkout' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-progress-spinner {
        display: inline-flex;
        flex-shrink: 0;
      }

      mat-progress-spinner ::ng-deep .mdc-circular-progress {
        display: block;
      }

      mat-progress-spinner ::ng-deep circle {
        stroke: currentColor;
      }
    `,
  ],
})
export class SelectPlanDialog {
  readonly #seatSummary = inject(EstablishmentSubscriptionStore).seatSummary;
  readonly #money = inject(MoneyFormatterService);

  protected readonly seats = computed(() => {
    const summary = this.#seatSummary();

    if (!summary) {
      return undefined;
    }

    return {
      ...summary,
      monthlyTotal: this.#money.format(summary.monthlyTotalCents),
      basePrice: this.#money.format(summary.basePriceCents),
      extraPrice: this.#money.format(summary.extraPriceCents),
    };
  });

  readonly loading = input(false);
  protected readonly SubscriptionPlan = SubscriptionPlan;

  readonly selected = output<Exclude<SubscriptionPlan, 'FREE'>>();
  readonly canceled = output<void>();
}
