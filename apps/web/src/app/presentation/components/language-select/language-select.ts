import { Component, input, model } from '@angular/core';
import { DisabledReason, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import type { Language } from '@coaster/common';
import { LANGUAGE_NAMES, LANGUAGES } from '@coaster/common';

@Component({
  selector: 'coaster-language-select',
  imports: [MatButtonToggle, MatButtonToggleGroup],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 items-start">
        @if (label()) {
          <span class="text-xs font-semibold text-on-surface-variant">{{ label() }}</span>
        }

        <mat-button-toggle-group
          class="w-fit"
          hideSingleSelectionIndicator
          [value]="value()"
          [disabled]="disabled()"
          (change)="onChange($event.value)"
          (blur)="touched.set(true)"
        >
          @for (language of choices(); track language) {
            <mat-button-toggle [value]="language">{{ nameOf(language) }}</mat-button-toggle>
          }
        </mat-button-toggle-group>

        @if (hint()) {
          <p class="text-xs text-on-surface-variant">{{ hint() }}</p>
        }
      </div>
    }
  `,
})
export class LanguageSelect {
  readonly value = model<Language>('es');

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

  protected onChange(language: Language | null) {
    if (this.readonly() || this.disabled() || !language) {
      return;
    }

    this.value.set(language);
    this.touched.set(true);
  }
}
