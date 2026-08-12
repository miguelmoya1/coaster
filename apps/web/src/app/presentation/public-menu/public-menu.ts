import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { Language } from '@coaster/common';
import { asLanguage } from '@coaster/common';
import { PublicMenuStore } from '@coaster/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSelect } from '../components/language-select/language-select';
import { Loading } from '../components/loading/loading';
import { PageContainer } from '../components/page-container/page-container';
import { PageHeader } from '../components/page-header/page-header';
import { PricePipe } from '../establishments/workspace/pipes/price/price';

@Component({
  selector: 'coaster-public-menu',
  imports: [MatIcon, TranslatePipe, PricePipe, LanguageSelect, Loading, PageContainer, PageHeader],
  host: { class: 'block min-h-dvh bg-surface px-5 py-8' },
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

  protected readonly languages = computed<Language[]>(() => this.menu()?.languages ?? []);

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
