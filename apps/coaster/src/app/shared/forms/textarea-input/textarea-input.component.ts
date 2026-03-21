import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import {
  DisabledReason,
  FormValueControl,
  ValidationError,
  WithOptionalFieldTree,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-textarea-input',
  imports: [NgIcon],
  providers: [provideIcons({ lucideAlertCircle })],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        @if (label()) {
          <label
            [for]="id()"
            class="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1"
            [class.text-error]="invalid()"
          >
            {{ label() }}
            @if (required()) {
              <span class="text-error">*</span>
            }
          </label>
        }

        <div class="relative flex">
          <textarea
            [id]="id()"
            [value]="value()"
            (input)="value.set($any($event.target).value)"
            (blur)="touched.set(true)"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [readonly]="readonly()"
            [rows]="rows()"
            [class.border-error]="invalid()"
            [class.focus:border-error]="invalid()"
            [class.focus:ring-error]="invalid()"
            class="w-full bg-surface-container rounded-xl border border-outline px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            [attr.aria-invalid]="invalid()"
          ></textarea>

          @if (invalid()) {
            <ng-icon
              name="lucideAlertCircle"
              class="absolute right-4 top-4 text-error text-xl"
            ></ng-icon>
          }
        </div>

        @if (invalid() && errors().length > 0) {
          <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
            @for (error of errors(); track error) {
              <span class="text-error text-xs">{{ error.message }}</span>
            }
          </div>
        }

        @if (disabled() && disabledReasons().length > 0) {
          <div class="flex flex-col gap-1 mt-1 ml-1">
            @for (reason of disabledReasons(); track reason) {
              <span class="text-on-surface-variant text-xs">{{
                reason.message
              }}</span>
            }
          </div>
        }

        @if (hint() && !invalid()) {
          <span class="text-on-surface-variant text-xs ml-1">{{ hint() }}</span>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaInputComponent implements FormValueControl<string> {
  // Required
  readonly value = model<string>('');
  readonly id = input<string>(crypto.randomUUID());

  // Custom props
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly rows = input<number>(3);

  // Writable interaction state
  readonly touched = model<boolean>(false);

  // Read-only state from form system
  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<
    readonly WithOptionalFieldTree<DisabledReason>[]
  >([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>(
    [],
  );
  readonly required = input<boolean>(false);
}
