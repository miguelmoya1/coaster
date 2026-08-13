import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { Language, PublishedMenu as Published } from '@coaster/common';
import { PublishedMenu } from '../services/published-menu';

@Service()
export class PublicMenuStore {
  readonly #publishedMenu = inject(PublishedMenu);

  readonly #slug = signal<string | null>(null);
  readonly #language = signal<Language | null>(null);

  public readonly language = this.#language.asReadonly();

  readonly #menuResource = httpResource<Published>(() => this.#publishedMenu.execute(this.#slug(), this.#language()));

  public readonly menu = this.#menuResource.asReadonly();

  public setSlug(slug: string) {
    this.#slug.set(slug);
  }

  public setLanguage(language: Language) {
    this.#language.set(language);
  }
}
