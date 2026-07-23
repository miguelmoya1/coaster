import { Component, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SubscriptionPlan } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-select-plan-dialog',
  imports: [MatButton, MatIcon, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions],
  template: `
    <div class="flex items-center gap-3 pt-6 px-6 pb-0">
      <div class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <mat-icon class="text-xl">rocket_launch</mat-icon>
      </div>
      <h2 mat-dialog-title class="!m-0 !p-0 text-xl font-bold text-on-surface">
        {{ 'billing.activate_pro_title' | translate }}
      </h2>
    </div>

    <mat-dialog-content class="!pt-3 !pb-4">
      <p class="text-sm text-on-surface-variant mb-4">
        {{ 'billing.activate_pro_subtitle' | translate }}
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Plan Mensual -->
        <button
          type="button"
          class="relative flex flex-col text-left w-full p-4 rounded-2xl !border-2 !border-solid cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          [class.!border-primary]="selectedPlan() === SubscriptionPlan.PRO_MONTHLY"
          [class.!bg-primary/5]="selectedPlan() === SubscriptionPlan.PRO_MONTHLY"
          [class.!border-outline-variant]="selectedPlan() !== SubscriptionPlan.PRO_MONTHLY"
          [class.!bg-surface-container/50]="selectedPlan() !== SubscriptionPlan.PRO_MONTHLY"
          [class.hover:!border-primary]="selectedPlan() !== SubscriptionPlan.PRO_MONTHLY"
          (click)="selectedPlan.set(SubscriptionPlan.PRO_MONTHLY)"
        >
          <div class="flex items-center justify-between mb-2 w-full">
            <span class="font-bold text-base text-on-surface">
              {{ 'billing.monthly_title' | translate }}
            </span>
            @if (selectedPlan() === SubscriptionPlan.PRO_MONTHLY) {
              <mat-icon class="text-primary text-xl shrink-0">check_circle</mat-icon>
            }
          </div>
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
        </button>

        <!-- Plan Anual -->
        <button
          type="button"
          class="relative flex flex-col text-left w-full p-4 rounded-2xl !border-2 !border-solid cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          [class.!border-primary]="selectedPlan() === SubscriptionPlan.PRO_YEARLY"
          [class.!bg-primary/5]="selectedPlan() === SubscriptionPlan.PRO_YEARLY"
          [class.!border-outline-variant]="selectedPlan() !== SubscriptionPlan.PRO_YEARLY"
          [class.!bg-surface-container/50]="selectedPlan() !== SubscriptionPlan.PRO_YEARLY"
          [class.hover:!border-primary]="selectedPlan() !== SubscriptionPlan.PRO_YEARLY"
          (click)="selectedPlan.set(SubscriptionPlan.PRO_YEARLY)"
        >
          <div
            class="absolute -top-3 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider"
          >
            {{ 'billing.yearly_badge' | translate }}
          </div>
          <div class="flex items-center justify-between mb-2 w-full">
            <span class="font-bold text-base text-on-surface">
              {{ 'billing.yearly_title' | translate }}
            </span>
            @if (selectedPlan() === SubscriptionPlan.PRO_YEARLY) {
              <mat-icon class="text-primary text-xl shrink-0">check_circle</mat-icon>
            }
          </div>
          <p class="text-xs text-on-surface-variant mb-4">
            {{ 'billing.yearly_subtitle' | translate }}
          </p>
          <ul class="text-xs text-on-surface-variant space-y-2 mt-auto">
            <li class="flex items-center gap-2">
              <mat-icon class="text-emerald-500 text-sm shrink-0">check</mat-icon>
              <span>{{ 'billing.yearly_feat_1' | translate }}</span>
            </li>
            <li class="flex items-center gap-2">
              <mat-icon class="text-emerald-500 text-sm shrink-0">check</mat-icon>
              <span>{{ 'billing.yearly_feat_2' | translate }}</span>
            </li>
          </ul>
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 px-6 pb-6 pt-2 border-none">
      <button mat-button (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" class="rounded-xl!" (click)="selected.emit(selectedPlan())">
        {{ 'billing.continue_to_checkout' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  host: {
    class: 'block max-w-lg w-full',
  },
})
export class SelectPlanDialog {
  protected readonly SubscriptionPlan = SubscriptionPlan;
  readonly selectedPlan = signal<Exclude<SubscriptionPlan, 'FREE'>>(SubscriptionPlan.PRO_MONTHLY);

  readonly selected = output<Exclude<SubscriptionPlan, 'FREE'>>();
  readonly canceled = output<void>();
}
