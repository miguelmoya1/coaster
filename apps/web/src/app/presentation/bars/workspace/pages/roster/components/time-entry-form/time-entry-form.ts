import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import type { BarMember, TimeEntry } from '@coaster/common';
import { asTimeEntryId, asUserId, TimeEntryType } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { TranslatePipe } from '@ngx-translate/core';

const REASON_MIN_LENGTH = 5;

@Component({
  selector: 'coaster-time-entry-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormRoot,
    FormField,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatTimepicker,
    MatTimepickerInput,
    MatTimepickerToggle,
    MatButton,
    TranslatePipe,
  ],
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">{{ title() | translate }}</h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'roster.time_tracking.reason_required' | translate }}
      </span>
    </div>

    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        @if (!entry()) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'roster.create_shift.staff_label' | translate }}</mat-label>
            <mat-select [formField]="form.userId">
              @for (option of memberOptions(); track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
            @if (form.userId().errors().length > 0) {
              <mat-error>{{
                form.userId().errors()[0].message || form.userId().errors()[0].kind
                  | translate: form.userId().errors()[0]
              }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'roster.time_tracking.mark_type' | translate }}</mat-label>
            <mat-select [formField]="form.type">
              @for (option of typeOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.time_tracking.hour' | translate }}</mat-label>
          <input matInput [matTimepicker]="picker" [formField]="form.time" />
          <mat-timepicker-toggle matIconSuffix [for]="picker"></mat-timepicker-toggle>
          <mat-timepicker #picker></mat-timepicker>
          @if (form.time().errors().length > 0) {
            <mat-error>{{
              form.time().errors()[0].message || form.time().errors()[0].kind | translate: form.time().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.time_tracking.reason' | translate }}</mat-label>
          <textarea
            matInput
            rows="3"
            [formField]="form.reason"
            [placeholder]="'roster.time_tracking.reason_placeholder' | translate"
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

          <button
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().invalid() || form().submitting() || form().disabled()"
          >
            {{ 'common.save' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class TimeEntryForm {
  readonly #store = inject(TimeTrackingStore);

  public readonly entry = input<TimeEntry>();
  public readonly members = input<BarMember[]>([]);
  public readonly workdayDate = input.required<string>();

  public readonly canceled = output<void>();
  public readonly saved = output<void>();

  protected readonly title = computed(() =>
    this.entry() ? 'roster.time_tracking.amend_title' : 'roster.time_tracking.create_title',
  );

  protected readonly memberOptions = computed(() =>
    this.members().map((member) => ({ value: member.userId, label: member.userName })),
  );

  protected readonly typeOptions = Object.values(TimeEntryType).map((type) => ({
    value: type,
    label: `roster.time_tracking.type_${type.toLowerCase()}`,
  }));

  readonly #formBase = linkedSignal(() => {
    const existing = this.entry();

    return {
      userId: (existing?.userId ?? '') as string,
      type: (existing?.type ?? TimeEntryType.CLOCK_IN) as TimeEntryType,
      time: existing ? new Date(existing.occurredAt) : null,
      reason: '',
    };
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.userId);
      required(fields.time);
      required(fields.reason);
      minLength(fields.reason, REASON_MIN_LENGTH);
      maxLength(fields.reason, 500);
    },
    {
      submission: {
        action: async (form) => {
          const raw = form().value();

          try {
            await this.#submit(raw.userId, raw.type, raw.time!, raw.reason);
            this.saved.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  #occurredAt(time: Date): string {
    const occurredAt = new Date(`${this.workdayDate()}T00:00:00`);
    occurredAt.setHours(time.getHours(), time.getMinutes(), 0, 0);

    return occurredAt.toISOString();
  }

  #submit(userId: string, type: TimeEntryType, time: Date, reason: string) {
    const existing = this.entry();

    if (existing) {
      return this.#store.amend(asTimeEntryId(existing.id), { occurredAt: this.#occurredAt(time), reason });
    }

    return this.#store.createEntry({
      userId: asUserId(userId),
      type,
      occurredAt: this.#occurredAt(time),
      reason,
    });
  }
}
