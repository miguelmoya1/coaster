import { Component, input, model } from '@angular/core';
import { DisabledReason, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Field } from '../field/field';
import { CoasterInput } from '../field/input.directive';

@Component({
  selector: 'coaster-number-input',
  imports: [MatIconButton, MatIcon, Field, CoasterInput],
  host: {
    '(click)': 'onHostClick($event)',
  },
  template: `
    @if (!hidden()) {
      <coaster-field
        [class]="wrapperClass()"
        [label]="label()"
        [hint]="hint()"
        [errors]="touched() && invalid() ? errors() : []"
      >
        <div class="relative">
          <button
            mat-icon-button
            type="button"
            class="absolute! left-1 top-1/2 -translate-y-1/2"
            (click)="decrement($event)"
            [disabled]="disabled() || readonly() || (min() !== undefined && value() <= min()!)"
          >
            <mat-icon>remove</mat-icon>
          </button>

          <input
            coasterInput
            type="number"
            inputmode="decimal"
            class="px-12 text-center font-bold"
            [id]="id()"
            [value]="value()"
            (input)="onInput($event)"
            (blur)="touched.set(true)"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [readonly]="readonly()"
            [min]="min()"
            [max]="max()"
          />

          <button
            mat-icon-button
            type="button"
            class="absolute! right-1 top-1/2 -translate-y-1/2"
            (click)="increment($event)"
            [disabled]="disabled() || readonly() || (max() !== undefined && value() >= max()!)"
          >
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </coaster-field>
    }
  `,
  styles: [
    `
      input[type='number'] {
        appearance: textfield;
      }

      input[type='number']::-webkit-inner-spin-button,
      input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    `,
  ],
})
export class NumberInput {
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
