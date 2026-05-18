import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { BarMember, asUserId } from '@coaster/common';
import { CoasterBtn, FormFieldMessages, SelectInput, TextInput, TextareaInput } from '@coaster/shared';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-create-shift-form',
  imports: [FormRoot, TextInput, TextareaInput, SelectInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
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

          const error = await this.#shiftsStore.create({
            userId: asUserId(raw.userId),
            startTime: raw.startTime,
            endTime: raw.endTime,
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
