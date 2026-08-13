import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { MenuRepository } from '../data-access/menu-repository';

@Service()
export class MenuDraft {
  readonly #repository = inject(MenuRepository);

  public execute(establishmentId: EstablishmentId | null) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#repository.routes.draft(establishmentId);
  }
}
