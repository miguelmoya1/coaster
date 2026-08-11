import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { Language } from '@coaster/common';
import { asLanguage, LANGUAGE_NAMES } from '@coaster/common';
import { PublicMenuStore } from '@coaster/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../establishments/workspace/pipes/price/price';

@Component({
  selector: 'coaster-public-menu',
  imports: [MatIcon, TranslatePipe, PricePipe],
  host: { class: 'block min-h-dvh bg-surface' },
  templateUrl: './public-menu.html',
})
export default class PublicMenu {
  public readonly slug = input.required<string>();
  public readonly lang = input<string>();

  readonly #store = inject(PublicMenuStore);

  protected readonly isLoading = computed(() => this.#store.menu.isLoading());
  protected readonly menu = computed(() => (this.#store.menu.hasValue() ? this.#store.menu.value() : null));
  protected readonly isMissing = computed(() => !this.isLoading() && !this.menu());
  protected readonly language = signal<Language>('es');

  /** Only what the menu itself offers: a switch to a language it has no wording for would read the same. */
  protected readonly languages = computed<Language[]>(() => this.menu()?.languages ?? []);

  /** Each language named in itself, the way a switcher on a menu should read to whoever needs it. */
  protected languageName(language: Language): string {
    return LANGUAGE_NAMES[language];
  }

  constructor() {
    effect(() => {
      this.#store.setSlug(this.slug());
    });

    effect(() => {
      const asked = this.lang();
      const chosen = asked ? asLanguage(asked) : asLanguage(navigator.language.split('-')[0]);

      this.language.set(chosen);
      this.#store.setLanguage(chosen);
    });
  }

  protected choose(language: Language) {
    this.language.set(language);
    this.#store.setLanguage(language);
  }
}
