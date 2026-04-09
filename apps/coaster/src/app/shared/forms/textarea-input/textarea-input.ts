import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';
import { FormFieldMessages } from '../form-field-messages/form-field-messages';

@Component({
  selector: 'coaster-textarea-input',
  imports: [NgIcon, FormFieldMessages],
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
            <ng-icon name="lucideAlertCircle" class="absolute right-4 top-4 text-error text-xl"></ng-icon>
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
export class TextareaInput implements FormValueControl<string> {
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
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);
}
