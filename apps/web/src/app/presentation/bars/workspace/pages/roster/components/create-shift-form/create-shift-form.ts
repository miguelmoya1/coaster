import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import type { BarMember } from '@coaster/common';
import { DateFormatterService, asUserId } from '@coaster/core';
import { RosterStateService } from '@coaster/roster';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-create-shift-form',
  imports: [
    FormRoot,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatTimepicker,
    MatTimepickerInput,
    MatTimepickerToggle,

    FormField,
    MatButton,
    TranslatePipe,
  ],
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">
        {{ 'roster.create_shift.title' | translate }}
      </h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'roster.create_shift.date_label' | translate }}: {{ formattedSelectedDate() }}
      </span>
    </div>

    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.create_shift.staff_label' | translate }}</mat-label>
          <mat-select [formField]="form.userId" [placeholder]="'roster.create_shift.staff_placeholder' | translate">
            @for (option of memberOptions(); track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
          @if (form.userId().errors().length > 0) {
            <mat-error>{{
              form.userId().errors()[0].message || form.userId().errors()[0].kind | translate: form.userId().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.create_shift.start_time_label' | translate }}</mat-label>
          <input matInput [matTimepicker]="startPicker" [formField]="form.startTime" />
          <mat-timepicker-toggle matIconSuffix [for]="startPicker"></mat-timepicker-toggle>
          <mat-timepicker #startPicker></mat-timepicker>
          @if (form.startTime().errors().length > 0) {
            <mat-error>{{
              form.startTime().errors()[0].message || form.startTime().errors()[0].kind
                | translate: form.startTime().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.create_shift.end_time_label' | translate }}</mat-label>
          <input matInput [matTimepicker]="endPicker" [formField]="form.endTime" />
          <mat-timepicker-toggle matIconSuffix [for]="endPicker"></mat-timepicker-toggle>
          <mat-timepicker #endPicker></mat-timepicker>
          @if (form.endTime().errors().length > 0) {
            <mat-error>{{
              form.endTime().errors()[0].message || form.endTime().errors()[0].kind
                | translate: form.endTime().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'roster.create_shift.notes_label' | translate }}</mat-label>
          <textarea
            matInput
            [formField]="form.notes"
            [placeholder]="'roster.create_shift.notes_placeholder' | translate"
            rows="3"
          ></textarea>
          @if (form.notes().errors().length > 0) {
            <mat-error>{{
              form.notes().errors()[0].message || form.notes().errors()[0].kind | translate: form.notes().errors()[0]
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
            [disabled]="form().disabled() || form().submitting() || disabled()"
            (click)="handleCancel()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().invalid() || form().submitting() || form().disabled() || disabled()"
          >
            {{ 'common.create' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CreateShiftForm {
  readonly members = input.required<BarMember[]>();
  readonly disabled = input(false);

  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly #shiftsStore = inject(ShiftsStore);
  readonly #rosterState = inject(RosterStateService);
  readonly #dateFormatter = inject(DateFormatterService);

  readonly formattedSelectedDate = computed(() => {
    return this.#dateFormatter.formatShortDate(this.#rosterState.selectedDate());
  });

  readonly memberOptions = computed(() => {
    return this.members().map((m) => ({
      value: m.userId,
      label: m.userName,
    }));
  });

  readonly #formBase = signal({
    userId: '',
    startTime: null as Date | null,
    endTime: null as Date | null,
    notes: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.userId);
      required(fields.startTime);
      required(fields.endTime);
    },
    {
      submission: {
        action: async (form) => {
          const raw = form().value();
          const selectedDate = new Date(this.#rosterState.selectedDate());

          const startTimeDate = new Date(selectedDate);
          startTimeDate.setHours(raw.startTime!.getHours(), raw.startTime!.getMinutes(), 0, 0);

          const endTimeDate = new Date(selectedDate);
          endTimeDate.setHours(raw.endTime!.getHours(), raw.endTime!.getMinutes(), 0, 0);

          if (endTimeDate < startTimeDate) {
            endTimeDate.setDate(endTimeDate.getDate() + 1);
          }

          const error = await this.#shiftsStore.create({
            userId: asUserId(raw.userId),
            startTime: startTimeDate.toISOString(),
            endTime: endTimeDate.toISOString(),
            notes: raw.notes || undefined,
          });

          if (!error) {
            this.created.emit();
          }

          return error;
        },
      },
    },
  );

  protected handleCancel() {
    this.canceled.emit();
  }
}
