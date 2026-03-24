import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import {
  DisabledReason,
  FormCheckboxControl,
  ValidationError,
  WithOptionalFieldTree,
} from '@angular/forms/signals';

@Component({
  selector: 'coaster-toggle-input',
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        <label
          [for]="id()"
          class="flex items-center gap-3 cursor-pointer"
          [class.opacity-50]="disabled()"
          [class.cursor-not-allowed]="disabled()"
        >
          <button
            [id]="id()"
            type="button"
            role="switch"
            [attr.aria-checked]="checked()"
            [attr.aria-invalid]="invalid()"
            [disabled]="disabled() || readonly()"
            (click)="toggle()"
            (blur)="touched.set(true)"
            [class.bg-primary]="checked()"
            [class.bg-surface-bright]="!checked()"
            [class.border-error]="invalid()"
            class="relative inline-flex h-7 w-12 shrink-0 border-2 border-transparent rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
          >
            <span
              [class.translate-x-5]="checked()"
              [class.translate-x-0]="!checked()"
              class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
            >
            </span>
          </button>

          <div class="flex flex-col gap-0.5">
            @if (label()) {
              <span
                class="text-sm font-medium text-on-surface"
                [class.text-error]="invalid()"
              >
                {{ label() }}
                @if (required()) {
                  <span class="text-error">*</span>
                }
              </span>
            }
            @if (hint()) {
              <span class="text-on-surface-variant text-xs">{{ hint() }}</span>
            }
          </div>
        </label>

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
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleInput implements FormCheckboxControl {
  // Required for FormCheckboxControl
  readonly checked = model<boolean>(false);
  readonly id = input<string>(crypto.randomUUID());

  // Custom props
  readonly label = input<string>('');
  readonly hint = input<string>('');

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

  toggle() {
    if (this.disabled() || this.readonly()) return;
    this.checked.update((val) => !val);
    this.touched.set(true);
  }
}
