import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { FormField, type ValidationError, type WithOptionalFieldTree } from '@angular/forms/signals';

const BASE =
  'coaster-input w-full rounded-xl bg-surface-container-highest text-on-surface text-sm ' +
  'placeholder:text-on-surface-variant/50 px-3 py-2.5 border outline-none transition-colors ' +
  'resize-y disabled:opacity-50 disabled:cursor-not-allowed';

const VALID = 'border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20';

const INVALID = 'border-error focus:border-error focus:ring-2 focus:ring-error/20';

const CLICKABLE_TAGS = ['SELECT', 'BUTTON'];

// El preflight de Tailwind resetea `[type="button"]` con la misma especificidad que una clase,
// y su regla va después, así que el fondo y el borde de arriba se pierden sin el `!`.
const BUTTON_OVERRIDES = 'bg-surface-container-highest! border!';

let nextId = 0;

@Directive({
  selector: 'input[coasterInput], textarea[coasterInput], select[coasterInput], button[coasterInput]',
  host: {
    class: BASE,
    '[class]': 'stateClass()',
    '[id]': 'id()',
    '[attr.aria-invalid]': 'invalid() || null',
  },
})
export class CoasterInput {
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #formField = inject<FormField<unknown>>(FormField, { optional: true, self: true });

  readonly id = input<string>(this.#element.nativeElement.id || `coaster-input-${++nextId}`);

  readonly error = computed<WithOptionalFieldTree<ValidationError> | undefined>(() => {
    const state = this.#formField?.state();
    if (!state?.touched()) return undefined;
    return state.errors()[0];
  });

  readonly invalid = computed(() => !!this.error());

  readonly #tagName = this.#element.nativeElement.tagName;

  readonly #tagClass = [
    CLICKABLE_TAGS.includes(this.#tagName) ? 'cursor-pointer' : 'cursor-text',
    this.#tagName === 'BUTTON' ? BUTTON_OVERRIDES : '',
  ]
    .filter(Boolean)
    .join(' ');

  protected readonly stateClass = computed(() => `${this.invalid() ? INVALID : VALID} ${this.#tagClass}`);
}
