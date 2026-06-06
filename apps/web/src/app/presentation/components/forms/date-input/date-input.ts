import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-date-input',
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule, TranslatePipe, MatIcon],
  template: `
    @if (!hidden()) {
      <mat-form-field class="w-full" appearance="outline">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }

        <input
          matInput
          [matDatepicker]="picker"
          [id]="id()"
          [value]="value()"
          (dateChange)="onDateChange($event.value)"
          (blur)="touched.set(true)"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [required]="required()"
          [min]="min()"
          [max]="max()"
          [attr.aria-invalid]="invalid()"
        />

        <mat-datepicker-toggle matSuffix [for]="picker" />
        <mat-datepicker #picker />

        @if (invalid() && !disabled() && touched()) {
          <mat-icon matPrefix class="text-error text-xl" style="font-size: 20px; width: 20px; height: 20px;">error</mat-icon>
        }

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInput implements FormValueControl<Date | null> {
  readonly value = model<Date | null>(null);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');

  readonly min = input<Date>();
  readonly max = input<Date>();

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  onDateChange(date: Date | null) {
    this.value.set(date);
    this.touched.set(true);
  }
}
