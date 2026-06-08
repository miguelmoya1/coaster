import { Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'coaster-select-input',
  imports: [MatFormFieldModule, MatSelectModule, TranslatePipe],
  template: `
    @if (!hidden()) {
      <mat-form-field class="w-full" appearance="outline">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }

        <mat-select
          [id]="id()"
          [disabled]="disabled() || readonly()"
          [value]="value()"
          (selectionChange)="onSelectionChange($event.value)"
          (blur)="onBlur()"
          [placeholder]="placeholder()"
        >
          @for (opt of options(); track opt.value) {
            <mat-option [value]="opt.value" [disabled]="opt.disabled || false">
              {{ opt.label }}
            </mat-option>
          }
        </mat-select>

        @if (invalid() && errors().length > 0) {
          @for (error of errors(); track error) {
            <mat-error>{{ error.message || error.kind | translate: error }}</mat-error>
          }
        }

        @if (disabled() && disabledReasons().length > 0) {
          @for (reason of disabledReasons(); track reason) {
            <mat-hint>{{ reason.message | translate: reason }}</mat-hint>
          }
        } @else if (hint() && !invalid()) {
          <mat-hint>{{ hint() }}</mat-hint>
        }
      </mat-form-field>
    }
  `,
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

  onSelectionChange(newVal: string | number) {
    if (newVal === '') {
      this.value.set(null);
      return;
    }

    const option = this.options().find((o) => String(o.value) === String(newVal));
    this.value.set(option ? option.value : newVal);
  }

  onBlur() {
    this.touched.set(true);
  }
}
