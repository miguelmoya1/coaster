import { Component, input, model } from '@angular/core';
import { DisabledReason, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

@Component({
  selector: 'coaster-chip-select',
  imports: [MatChipListbox, MatChipOption],
  template: `
    @if (!hidden()) {
      <fieldset class="flex flex-col gap-1">
        @if (label()) {
          <legend class="text-xs font-semibold text-on-surface-variant mb-1">{{ label() }}</legend>
        }

        <mat-chip-listbox
          multiple
          [disabled]="disabled()"
          [value]="value()"
          (change)="onChange($event.value)"
          (blur)="touched.set(true)"
        >
          @for (option of options(); track option.value) {
            <mat-chip-option [value]="option.value" [selectable]="!readonly()">{{ option.label }}</mat-chip-option>
          }
        </mat-chip-listbox>

        @if (hint()) {
          <p class="text-xs text-on-surface-variant">{{ hint() }}</p>
        }

        @if (invalid() && errors().length > 0) {
          <p class="text-error text-xs font-medium" role="alert">{{ errors()[0].message || errors()[0].kind }}</p>
        }
      </fieldset>
    }
  `,
})
export class ChipSelect<T extends string = string> {
  readonly value = model<T[]>([]);
  readonly options = input.required<ChipOption<T>[]>();

  readonly label = input<string>('');
  readonly hint = input<string>('');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  protected onChange(selected: T[] | T | null) {
    if (this.readonly() || this.disabled()) {
      return;
    }

    this.value.set(Array.isArray(selected) ? selected : selected ? [selected] : []);
    this.touched.set(true);
  }
}
