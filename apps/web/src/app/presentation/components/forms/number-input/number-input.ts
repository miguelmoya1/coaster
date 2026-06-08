import { booleanAttribute, Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-number-input',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe, MatIcon],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        <div class="relative flex items-center gap-2">
          @if (showControls()) {
            <button
              type="button"
              mat-stroked-button
              (click)="decrement()"
              [disabled]="disabled() || readonly() || (min() !== undefined && value() <= min()!)"
            >
              <mat-icon style="font-size: 20px; width: 20px; height: 20px;">remove</mat-icon>
            </button>
          }

          <mat-form-field class="flex-1" appearance="outline">
            @if (label()) {
              <mat-label>{{ label() }}</mat-label>
            }

            @if (icon()) {
              <mat-icon
                matPrefix
                class="mr-2 text-on-surface-variant text-xl"
                [class.text-error]="invalid()"
                style="font-size: 20px; width: 20px; height: 20px;"
              >{{ icon() }}</mat-icon>
            }

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
              [class.text-center]="showControls()"
            />

            @if (invalid() && !showControls()) {
              <mat-icon
                matSuffix
                class="text-error text-xl"
                style="font-size: 20px; width: 20px; height: 20px;"
              >error</mat-icon>
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

          @if (showControls()) {
            <button
              type="button"
              mat-stroked-button
              (click)="increment()"
              [disabled]="disabled() || readonly() || (max() !== undefined && value() >= max()!)"
            >
              <mat-icon style="font-size: 20px; width: 20px; height: 20px;">add</mat-icon>
            </button>
          }
        </div>
      </div>
    }
  `,
  })
export class NumberInput implements FormValueControl<number> {
  readonly value = model<number>(0);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly icon = input<string>();
  readonly showControls = input(false, { transform: booleanAttribute });
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

  onInput(event: Event) {
    const el = event.target as HTMLInputElement;
    const val = parseFloat(el.value);
    if (!isNaN(val)) {
      this.value.set(val);
    }
  }

  increment() {
    if (this.disabled() || this.readonly()) return;
    const current = this.value() || 0;
    const nextItem = current + this.step();
    const maxVal = this.max();
    if (maxVal !== undefined && nextItem > maxVal) return;
    this.value.set(nextItem);
    this.touched.set(true);
  }

  decrement() {
    if (this.disabled() || this.readonly()) return;
    const current = this.value() || 0;
    const nextItem = current - this.step();
    const minVal = this.min();
    if (minVal !== undefined && nextItem < minVal) return;
    this.value.set(nextItem);
    this.touched.set(true);
  }
}
