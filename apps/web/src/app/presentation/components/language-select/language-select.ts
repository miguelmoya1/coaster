import { Component, input, model } from '@angular/core';
import { DisabledReason, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import type { Language } from '@coaster/common';
import { LANGUAGE_NAMES, LANGUAGES } from '@coaster/common';

/**
 * Every language the app has, named in itself, bound to a signal form the same way the other inputs
 * are. Adding a language changes `LANGUAGES` and nothing on any screen.
 */
@Component({
  selector: 'coaster-language-select',
  imports: [MatChipListbox, MatChipOption],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 items-start">
        @if (label()) {
          <span class="text-xs font-semibold text-on-surface-variant">{{ label() }}</span>
        }

        <mat-chip-listbox
          [value]="value()"
          [disabled]="disabled()"
          (change)="onChange($event.value)"
          (blur)="touched.set(true)"
        >
          @for (language of choices(); track language) {
            <mat-chip-option [value]="language" [selectable]="!readonly()">{{ nameOf(language) }}</mat-chip-option>
          }
        </mat-chip-listbox>

        @if (hint()) {
          <p class="text-xs text-on-surface-variant">{{ hint() }}</p>
        }
      </div>
    }
  `,
})
export class LanguageSelect {
  readonly value = model<Language>('es');

  /** Narrow it when only some languages apply, such as the ones a menu offers. */
  readonly choices = input<readonly Language[]>(LANGUAGES);

  readonly label = input<string>('');
  readonly hint = input<string>('');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  protected nameOf(language: Language): string {
    return LANGUAGE_NAMES[language];
  }

  /** A listbox reports null when the chosen chip is tapped again; a menu always has a language. */
  protected onChange(language: Language | null) {
    if (this.readonly() || this.disabled() || !language) {
      return;
    }

    this.value.set(language);
    this.touched.set(true);
  }
}
