import { asUserId } from '@coaster/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import type { EstablishmentMember } from '@coaster/common';
import { DateFormatterService, handleErrorFormField } from '@coaster/core';
import { ScheduleStateService } from '@coaster/schedule';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-create-shift-form',
  imports: [
    FormRoot,
    MatTimepicker,
    MatTimepickerInput,
    MatTimepickerToggle,
    FormField,
    MatButton,
    TranslatePipe,
    Field,
    CoasterInput,
  ],
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">
        {{ 'schedule.create_shift.title' | translate }}
      </h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'schedule.create_shift.date_label' | translate }}: {{ formattedSelectedDate() }}
      </span>
    </div>

    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-field [label]="'schedule.create_shift.staff_label' | translate">
          <select coasterInput [formField]="form.userId">
            <option value="" disabled>{{ 'schedule.create_shift.staff_placeholder' | translate }}</option>
            @for (option of memberOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </coaster-field>

        <coaster-field [label]="'schedule.create_shift.start_time_label' | translate">
          <div class="relative">
            <input coasterInput class="pr-11" [matTimepicker]="startPicker" [formField]="form.startTime" />
            <mat-timepicker-toggle class="absolute right-1 top-1/2 -translate-y-1/2" [for]="startPicker" />
            <mat-timepicker #startPicker />
          </div>
        </coaster-field>

        <coaster-field [label]="'schedule.create_shift.end_time_label' | translate">
          <div class="relative">
            <input coasterInput class="pr-11" [matTimepicker]="endPicker" [formField]="form.endTime" />
            <mat-timepicker-toggle class="absolute right-1 top-1/2 -translate-y-1/2" [for]="endPicker" />
            <mat-timepicker #endPicker />
          </div>
        </coaster-field>

        <coaster-field [label]="'schedule.create_shift.notes_label' | translate">
          <textarea
            coasterInput
            [formField]="form.notes"
            [placeholder]="'schedule.create_shift.notes_placeholder' | translate"
            rows="3"
          ></textarea>
        </coaster-field>

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
  readonly members = input.required<EstablishmentMember[]>();
  readonly disabled = input(false);

  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly #shiftsStore = inject(ShiftsStore);
  readonly #scheduleState = inject(ScheduleStateService);
  readonly #dateFormatter = inject(DateFormatterService);

  readonly formattedSelectedDate = computed(() => {
    return this.#dateFormatter.formatShortDate(this.#scheduleState.selectedDate());
  });

  readonly memberOptions = computed(() => {
    return this.members().map((m) => ({
      value: m.userId,
      label: m.userName,
    }));
  });

  readonly #formBase = signal({
    userId: '',
    startTime: null as Date | string | null,
    endTime: null as Date | string | null,
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
          const selectedDate = new Date(this.#scheduleState.selectedDate());

          const parseTime = (time: Date | string): { hours: number; minutes: number } => {
            if (time instanceof Date) {
              return { hours: time.getHours(), minutes: time.getMinutes() };
            }
            if (typeof time === 'string') {
              const [h, m] = time.split(':');
              return { hours: parseInt(h, 10) || 0, minutes: parseInt(m, 10) || 0 };
            }
            return { hours: 0, minutes: 0 };
          };

          const startParsed = parseTime(raw.startTime!);
          const startTimeDate = new Date(selectedDate);
          startTimeDate.setHours(startParsed.hours, startParsed.minutes, 0, 0);

          const endParsed = parseTime(raw.endTime!);
          const endTimeDate = new Date(selectedDate);
          endTimeDate.setHours(endParsed.hours, endParsed.minutes, 0, 0);

          if (endTimeDate < startTimeDate) {
            endTimeDate.setDate(endTimeDate.getDate() + 1);
          }

          try {
            await this.#shiftsStore.create({
              userId: asUserId(raw.userId),
              startTime: startTimeDate.toISOString(),
              endTime: endTimeDate.toISOString(),
              notes: raw.notes || undefined,
            });
            this.created.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected handleCancel() {
    this.canceled.emit();
  }
}
