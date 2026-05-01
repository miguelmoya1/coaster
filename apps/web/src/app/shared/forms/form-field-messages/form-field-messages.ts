import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DisabledReason, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';

@Component({
  selector: 'coaster-form-field-messages',
  template: `
    @if (invalid() && errors().length > 0) {
      <div
        class="flex flex-col gap-1 mt-1 ml-1"
        role="alert"
        animate.enter="fade-slide-in"
        animate.leave="fade-slide-out"
      >
        @for (error of errors(); track error) {
          <span class="text-error text-xs font-medium">{{ error.message }}</span>
        }
      </div>
    }

    @if (disabled() && disabledReasons().length > 0) {
      <div class="flex flex-col gap-1 mt-1 ml-1" animate.enter="fade-slide-in" animate.leave="fade-slide-out">
        @for (reason of disabledReasons(); track reason) {
          <span class="text-on-surface-variant text-xs font-medium">{{ reason.message }}</span>
        }
      </div>
    }

    @if (hint() && !invalid()) {
      <div class="flex flex-col gap-1 mt-1 ml-1" animate.enter="fade-slide-in" animate.leave="fade-slide-out">
        <span class="text-on-surface-variant text-xs">{{ hint() }}</span>
      </div>
    }
  `,
  styles: `
    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeSlideOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
    .fade-slide-in {
      animation: fadeSlideIn 0.2s ease-out forwards;
    }
    .fade-slide-out {
      animation: fadeSlideOut 0.2s ease-in forwards;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldMessages {
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly hint = input<string>('');
}
