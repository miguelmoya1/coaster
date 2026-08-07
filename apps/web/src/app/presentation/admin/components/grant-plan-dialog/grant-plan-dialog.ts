import { Component, input, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { SubscriptionPlan } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

export interface GrantPlanResult {
  durationDays: number | null;
  reason: string;
}

const DURATION_OPTIONS: { days: number | null; labelKey: string }[] = [
  { days: 7, labelKey: 'admin.grant_dialog.duration_7' },
  { days: 30, labelKey: 'admin.grant_dialog.duration_30' },
  { days: 90, labelKey: 'admin.grant_dialog.duration_90' },
  { days: 365, labelKey: 'admin.grant_dialog.duration_365' },
  { days: null, labelKey: 'admin.grant_dialog.duration_forever' },
];

@Component({
  selector: 'coaster-grant-plan-dialog',
  imports: [
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-3 m-0 p-0 text-xl font-bold text-on-surface">
      <span class="w-10 h-10 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
        <mat-icon>workspace_premium</mat-icon>
      </span>
      {{ 'admin.grant_dialog.title' | translate: { plan: plan } }}
    </h2>

    <mat-dialog-content class="min-w-[min(90vw,26rem)]">
      <p class="text-sm text-on-surface-variant mb-4">
        {{ 'admin.grant_dialog.subtitle' | translate: { bar: barName() } }}
      </p>

      <fieldset class="border-0 p-0 m-0 mb-4">
        <legend class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
          {{ 'admin.grant_dialog.duration_label' | translate }}
        </legend>

        <div class="flex flex-wrap gap-2">
          @for (option of durationOptions; track option.labelKey) {
            <button
              type="button"
              class="px-3 py-1.5 rounded-full text-sm border transition-colors"
              [class]="
                selectedDuration() === option.days
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
              "
              [attr.aria-pressed]="selectedDuration() === option.days"
              (click)="selectedDuration.set(option.days)"
            >
              {{ option.labelKey | translate }}
            </button>
          }
        </div>
      </fieldset>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>{{ 'admin.grant_dialog.reason_label' | translate }}</mat-label>
        <input matInput maxlength="280" [value]="reason()" (input)="onReasonInput($event)" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-2 p-0 border-none">
      <button mat-button type="button" [disabled]="loading()" (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button
        mat-flat-button
        type="button"
        [disabled]="loading()"
        [attr.aria-busy]="loading()"
        (click)="confirmed.emit({ durationDays: selectedDuration(), reason: reason().trim() })"
      >
        {{ 'admin.grant_dialog.confirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
})
export class GrantPlanDialog {
  public readonly barName = input.required<string>();
  public readonly loading = input(false);

  public readonly confirmed = output<GrantPlanResult>();
  public readonly canceled = output<void>();

  protected readonly plan = SubscriptionPlan.PRO;
  protected readonly durationOptions = DURATION_OPTIONS;
  protected readonly selectedDuration = signal<number | null>(30);
  protected readonly reason = signal('');

  protected onReasonInput(event: Event) {
    this.reason.set((event.target as HTMLInputElement).value);
  }
}
