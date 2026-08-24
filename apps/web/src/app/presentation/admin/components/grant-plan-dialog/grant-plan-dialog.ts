import { Component, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { SubscriptionPlan } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { CoasterInput } from '../../../components/field/input.directive';

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
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    TranslatePipe,
    FormRoot,
    FormField,
    Field,
    CoasterInput,
  ],
  template: `
    <form [formRoot]="form">
      <h2 mat-dialog-title class="flex items-center gap-3 m-0 p-0 text-xl font-bold text-on-surface">
        <span class="w-10 h-10 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
          <mat-icon>workspace_premium</mat-icon>
        </span>
        {{ 'admin.grant_dialog.title' | translate: { plan: plan } }}
      </h2>

      <mat-dialog-content class="min-w-[min(90vw,26rem)]">
        <p class="text-sm text-on-surface-variant mb-4">
          {{ 'admin.grant_dialog.subtitle' | translate: { establishment: establishmentName() } }}
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
                  form.durationDays().value() === option.days
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                "
                [attr.aria-pressed]="form.durationDays().value() === option.days"
                (click)="form.durationDays().value.set(option.days)"
              >
                {{ option.labelKey | translate }}
              </button>
            }
          </div>
        </fieldset>

        <coaster-field [label]="'admin.grant_dialog.reason_label' | translate">
          <input coasterInput enterkeyhint="send" [formField]="form.reason" />
        </coaster-field>
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end gap-3 mt-2 p-0 border-none">
        <button mat-button type="button" [disabled]="form().submitting()" (click)="canceled.emit()">
          {{ 'common.cancel' | translate }}
        </button>
        <button
          mat-flat-button
          type="submit"
          [disabled]="form().disabled() || form().submitting()"
          [attr.aria-busy]="form().submitting()"
        >
          {{ 'admin.grant_dialog.confirm' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class GrantPlanDialog {
  public readonly establishmentName = input.required<string>();

  public readonly confirmed = output<GrantPlanResult>();
  public readonly canceled = output<void>();

  protected readonly plan = SubscriptionPlan.PRO;
  protected readonly durationOptions = DURATION_OPTIONS;

  readonly #formBase = signal<GrantPlanResult>({ durationDays: 30, reason: '' });

  readonly form = form(
    this.#formBase,
    (fields) => {
      maxLength(fields.reason, 280);
    },
    {
      submission: {
        action: async (form) => {
          const { durationDays, reason } = form().value();

          this.confirmed.emit({ durationDays, reason: reason.trim() });

          return null;
        },
      },
    },
  );
}
