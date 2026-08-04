import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SubscriptionPlan } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-select-plan-dialog',
  imports: [MatButton, MatIcon, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions],
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
        (click)="selected.emit(SubscriptionPlan.PRO)"
      >
        @if (loading()) {
          <mat-icon class="animate-spin">progress_activity</mat-icon>
        }
        {{ 'billing.continue_to_checkout' | translate }}
      </button>
    </mat-dialog-actions>
  `,
})
export class SelectPlanDialog {
  readonly loading = input(false);
  protected readonly SubscriptionPlan = SubscriptionPlan;

  readonly selected = output<Exclude<SubscriptionPlan, 'FREE'>>();
  readonly canceled = output<void>();

}
