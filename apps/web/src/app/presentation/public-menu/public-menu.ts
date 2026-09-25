import { Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import type { Language, PublishedMenu } from '@coaster/common';
import type { PageResource } from '@coaster/core';
import { menuLanguageOf } from '@coaster/menu';
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
  public readonly published = input.required<PageResource<PublishedMenu>>();

  readonly #router = inject(Router);

  protected readonly isLoading = computed(() => this.published().isLoading());
  protected readonly menu = computed(() => {
    const published = this.published();
    return published.hasValue() ? published.value() : null;
  });
  protected readonly isMissing = computed(() => this.published().status() === 'error');
  protected readonly language = computed(() => menuLanguageOf(this.lang()));

  protected readonly languages = computed<Language[]>(() => this.menu()?.languages ?? []);

  protected choose(language: Language) {
    void this.#router.navigate(['/m', this.slug()], { queryParams: { lang: language } });
  }
}
