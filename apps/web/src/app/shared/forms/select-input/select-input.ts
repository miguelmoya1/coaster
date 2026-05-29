import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideChevronDown } from '@ng-icons/lucide';
import { CoasterLabel } from '../../components/typography/typography';
import { FormFieldMessages } from '../form-field-messages/form-field-messages';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'coaster-select-input',
  imports: [NgIcon, CoasterLabel, FormFieldMessages],
  providers: [provideIcons({ lucideAlertCircle, lucideChevronDown })],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        @if (label()) {
          <label [for]="id()" coaster-label class="ml-1" [class.text-error]="invalid()">
            {{ label() }}
            @if (required()) {
              <span class="text-error">*</span>
            }
          </label>
        }

        <div class="relative w-full group">
          <select
            [id]="id()"
            [disabled]="disabled() || readonly()"
            [attr.aria-invalid]="invalid()"
            (change)="onChange($event)"
            (blur)="onBlur()"
            class="custom-select h-14 w-full bg-surface-container rounded-xl px-4 pr-10 flex items-center justify-between border transition-all text-on-surface text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            [class.border-outline]="!invalid()"
            [class.border-error]="invalid()"
            [class.opacity-50]="disabled() || readonly()"
            [class.pointer-events-none]="disabled() || readonly()"
            [class.text-on-surface-variant]="!hasValue()"
          >
            @if (placeholder()) {
              <option value="" disabled [selected]="!hasValue()" hidden>{{ placeholder() }}</option>
            }

            @for (opt of options(); track opt.value) {
              <option [value]="opt.value" [disabled]="opt.disabled || false" [selected]="value() === opt.value">
                {{ opt.label }}
              </option>
            }
          </select>

          <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none shrink-0">
            @if (invalid()) {
              <ng-icon name="lucideAlertCircle" class="text-error text-xl" />
            }
            <ng-icon
              name="lucideChevronDown"
              class="text-on-surface-variant text-xl group-focus-within:rotate-180 transition-transform"
            />
          </div>
        </div>

        <coaster-form-field-messages
          [invalid]="invalid()"
          [disabled]="disabled()"
          [errors]="errors()"
          [disabledReasons]="disabledReasons()"
          [hint]="hint()"
        />
      </div>
    }
  `,
  styles: `
    .custom-select {
      appearance: base-select;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .custom-select::picker(select) {
      appearance: base-select;
      background-color: var(--color-surface-container-high);
      border-radius: 0.75rem;
      border: 1px solid var(--color-outline);
      box-shadow: var(--shadow-elevated);
      padding: 0.25rem 0;
      margin-top: 0.5rem;
    }

    .custom-select option {
      padding: 1.5rem 2rem;
      font-size: 1.125rem;
      line-height: 1.5rem;
      color: var(--color-on-surface);
      cursor: pointer;
    }

    .custom-select option:hover,
    .custom-select option:focus {
      background-color: var(--color-surface-bright);
    }

    .custom-select option:checked {
      background-color: var(--color-primary-container);
      color: var(--color-on-primary);
      font-weight: 500;
    }

    .custom-select option::checkmark {
      display: inline-block;
      color: var(--color-on-primary);
      margin-left: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInput implements FormValueControl<string | number | null> {
  readonly value = model<string | number | null>(null);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('Select an option...');
  readonly hint = input<string>('');
  readonly options = input<SelectOption[]>([]);

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  readonly hasValue = computed(() => this.value() !== null && this.value() !== undefined && this.value() !== '');

  onChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    let newVal: string | number | null = target.value;

    if (newVal === '') {
      this.value.set(null);
      return;
    }

    const option = this.options().find((o) => String(o.value) === newVal);
    if (option) {
      newVal = option.value;
    }

    this.value.set(newVal);
  }

  onBlur() {
    this.touched.set(true);
  }
}
