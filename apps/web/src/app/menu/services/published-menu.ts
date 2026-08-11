import { inject, Service } from '@angular/core';
import type { Language } from '@coaster/common';
import { MenuRepository } from '../data-access/menu-repository';

@Service()
export class PublishedMenu {
  readonly #repository = inject(MenuRepository);

  public execute(slug: string | null, language: Language | null) {
    if (!slug || !language) {
      return undefined;
    }

    return this.#repository.routes.published(slug, language);
  }
}
