import { Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatFormField, MatLabel, MatHint, MatError, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-number-input',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatPrefix, MatSuffix, MatInput, MatIconButton, TranslatePipe, MatIcon],
  host: {
    '(click)': 'onHostClick($event)'
  },
  template: `
    @if (!hidden()) {
      <mat-form-field [class]="wrapperClass()" appearance="outline" subscriptSizing="dynamic">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }

        <button 
          mat-icon-button 
          matPrefix 
          type="button" 
          (click)="decrement($event)" 
          [disabled]="disabled() || readonly() || (min() !== undefined && value() <= min()!)"
        >
          <mat-icon>remove</mat-icon>
        </button>

        <input
          matInput
          type="number"
          [id]="id()"
          [value]="value()"
          (input)="onInput($event)"
          (blur)="touched.set(true)"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [min]="min()"
          [max]="max()"
          class="text-center font-bold"
          style="appearance: textfield; -moz-appearance: textfield;"
        />

        <button 
          mat-icon-button 
          matSuffix 
          type="button" 
          (click)="increment($event)" 
          [disabled]="disabled() || readonly() || (max() !== undefined && value() >= max()!)"
        >
          <mat-icon>add</mat-icon>
        </button>

        @if (invalid() && errors().length > 0) {
          @for (error of errors(); track error) {
            <mat-error>{{ error.message || error.kind | translate: error }}</mat-error>
          }
        } @else if (hint() && !invalid()) {
          <mat-hint>{{ hint() }}</mat-hint>
        }
      </mat-form-field>
    }
  `,
  styles: [`
    /* Hide native number input arrows */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
  `]
})
export class NumberInput implements FormValueControl<number> {
  readonly value = model<number>(0);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly wrapperClass = input<string>('w-full');
  readonly step = input<number>(1);

  readonly min = input<number>();
  readonly max = input<number>();

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  onHostClick(event: Event) {
    event.stopPropagation();
  }

  onInput(event: Event) {
    const el = event.target as HTMLInputElement;
    const val = parseFloat(el.value);
    if (!isNaN(val)) {
      this.value.set(val);
    }
  }

  increment(event?: Event) {
    event?.stopPropagation();
    if (this.disabled() || this.readonly()) return;
    const current = this.value() || 0;
    const nextItem = current + this.step();
    const maxVal = this.max();
    if (maxVal !== undefined && nextItem > maxVal) return;
    this.value.set(nextItem);
    this.touched.set(true);
  }

  decrement(event?: Event) {
    event?.stopPropagation();
    if (this.disabled() || this.readonly()) return;
    const current = this.value() || 0;
    const nextItem = current - this.step();
    const minVal = this.min();
    if (minVal !== undefined && nextItem < minVal) return;
    this.value.set(nextItem);
    this.touched.set(true);
  }
}
