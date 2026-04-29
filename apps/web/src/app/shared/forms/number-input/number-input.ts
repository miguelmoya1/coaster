import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideMinus, lucidePlus } from '@ng-icons/lucide';
import { CoasterLabel } from '../../components/typography/typography';
import { FormFieldMessages } from '../form-field-messages/form-field-messages';

@Component({
  selector: 'coaster-number-input',
  imports: [NgIcon, CoasterLabel, FormFieldMessages],
  providers: [provideIcons({ lucideAlertCircle, lucideMinus, lucidePlus })],
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

        <div class="relative flex items-center gap-2">
          @if (showControls()) {
            <button
              type="button"
              class="h-14 w-14 flex items-center justify-center bg-surface-container rounded-xl border border-outline text-on-surface active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-bright"
              (click)="decrement()"
              [disabled]="disabled() || readonly() || (min() !== undefined && value() <= min()!)"
            >
              <ng-icon name="lucideMinus" class="text-xl"></ng-icon>
            </button>
          }

          <div class="relative flex-1">
            @if (icon()) {
              <ng-icon
                [name]="icon()!"
                class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl z-10"
                [class.text-error]="invalid()"
              ></ng-icon>
            }

            <input
              [id]="id()"
              type="number"
              [value]="value()"
              (input)="onInput($event)"
              (blur)="touched.set(true)"
              [placeholder]="placeholder()"
              [disabled]="disabled()"
              [readonly]="readonly()"
              [min]="min()"
              [max]="max()"
              [class.border-error]="invalid()"
              [class.focus:border-error]="invalid()"
              [class.focus:ring-error]="invalid()"
              [class.pl-11]="icon()"
              [class.text-center]="showControls()"
              class="w-full h-14 bg-surface-container rounded-xl border border-outline px-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              [attr.aria-invalid]="invalid()"
            />

            @if (invalid() && !showControls()) {
              <ng-icon
                name="lucideAlertCircle"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-error text-xl"
              ></ng-icon>
            }
          </div>

          @if (showControls()) {
            <button
              type="button"
              class="h-14 w-14 flex items-center justify-center bg-surface-container rounded-xl border border-outline text-on-surface active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-bright"
              (click)="increment()"
              [disabled]="disabled() || readonly() || (max() !== undefined && value() >= max()!)"
            >
              <ng-icon name="lucidePlus" class="text-xl"></ng-icon>
            </button>
          }
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
