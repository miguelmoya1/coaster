import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { BarMember, asUserId } from '@coaster/common';
import { DateFormatterService } from '@coaster/core';
import { RosterStateService } from '@coaster/roster';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn } from '../../../../../../components/button/button';
import { FormFieldMessages } from '../../../../../../components/forms/form-field-messages/form-field-messages';
import { SelectInput } from '../../../../../../components/forms/select-input/select-input';
import { TextInput } from '../../../../../../components/forms/text-input/text-input';
import { TextareaInput } from '../../../../../../components/forms/textarea-input/textarea-input';

@Component({
  selector: 'coaster-create-shift-form',
  imports: [FormRoot, TextInput, TextareaInput, SelectInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
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
        <coaster-select-input
          [formField]="form.userId"
          [label]="'roster.create_shift.staff_label' | translate"
          [options]="memberOptions()"
          [placeholder]="'roster.create_shift.staff_placeholder' | translate"
        />

        <coaster-text-input
          [formField]="form.startTime"
          [label]="'roster.create_shift.start_time_label' | translate"
          type="time"
        />

        <coaster-text-input
          [formField]="form.endTime"
          [label]="'roster.create_shift.end_time_label' | translate"
          type="time"
        />

        <coaster-textarea-input
          [formField]="form.notes"
          [label]="'roster.create_shift.notes_label' | translate"
          [placeholder]="'roster.create_shift.notes_placeholder' | translate"
        />

        @if (form().errors().length > 0) {
          <coaster-form-field-messages [invalid]="true" [errors]="form().errors()" />
        }

        <div class="flex justify-end mt-4 gap-2">
          <button
            coaster-btn
            class="w-full"
            type="button"
            variant="outline"
            [disabled]="form().disabled() || form().submitting() || disabled()"
            (click)="handleCancel()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            coaster-btn
            class="w-full"
            type="submit"
            variant="primary"
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
    startTime: '',
    endTime: '',
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
          const selectedDate = this.#rosterState.selectedDate();

          const [startHours, startMinutes] = raw.startTime.split(':').map(Number);
          const startTimeDate = new Date(selectedDate);
          startTimeDate.setHours(startHours, startMinutes, 0, 0);

          const [endHours, endMinutes] = raw.endTime.split(':').map(Number);
          const endTimeDate = new Date(selectedDate);
          endTimeDate.setHours(endHours, endMinutes, 0, 0);

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
