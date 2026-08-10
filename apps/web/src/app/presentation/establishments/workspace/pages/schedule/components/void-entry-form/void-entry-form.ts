import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { TimeEntry } from '@coaster/common';
import { asTimeEntryId } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-void-entry-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormRoot, FormField, MatFormField, MatLabel, MatError, MatInput, MatButton, TranslatePipe],
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">
        {{ 'schedule.time_tracking.void_title' | translate }}
      </h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'schedule.time_tracking.void_hint' | translate }}
      </span>
    </div>

    <form [formRoot]="form">
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>{{ 'schedule.time_tracking.reason' | translate }}</mat-label>
        <textarea
          matInput
          rows="3"
          [formField]="form.reason"
          [placeholder]="'schedule.time_tracking.reason_placeholder' | translate"
        ></textarea>
        @if (form.reason().errors().length > 0) {
          <mat-error>{{
            form.reason().errors()[0].message || form.reason().errors()[0].kind | translate: form.reason().errors()[0]
          }}</mat-error>
        }
      </mat-form-field>

      @if (form().errors().length > 0) {
        <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
          @for (error of form().errors(); track error) {
            <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
          }
        </div>
      }

      <div class="flex justify-end mt-4 gap-2">
        <button
          mat-stroked-button
          class="w-full"
          type="button"
          [disabled]="form().submitting()"
          (click)="canceled.emit()"
        >
          {{ 'common.cancel' | translate }}
        </button>

        <button mat-flat-button class="w-full" type="submit" [disabled]="form().invalid() || form().submitting()">
          {{ 'schedule.time_tracking.void' | translate }}
        </button>
      </div>
    </form>
  `,
})
export class VoidEntryForm {
  readonly #store = inject(TimeTrackingStore);

  public readonly entry = input.required<TimeEntry>();

  public readonly canceled = output<void>();
  public readonly voided = output<void>();

  readonly #formBase = signal({ reason: '' });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.reason);
      minLength(fields.reason, 5);
      maxLength(fields.reason, 500);
    },
    {
      submission: {
        action: async (form) => {
          try {
            await this.#store.voidEntry(asTimeEntryId(this.entry().id), { reason: form().value().reason });
            this.voided.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );
}
