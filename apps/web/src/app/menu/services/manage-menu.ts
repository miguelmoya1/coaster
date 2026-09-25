import { inject, Service } from '@angular/core';
import type { EstablishmentId, MenuDraft, SaveMenuDraftDto } from '@coaster/common';
import { MenuRepository } from '../data-access/menu-repository';

@Service()
export class ManageMenu {
  readonly #repository = inject(MenuRepository);

  public async save(establishmentId: EstablishmentId, dto: SaveMenuDraftDto): Promise<MenuDraft> {
    return this.#repository.save(establishmentId, dto);
  }

  public async publish(establishmentId: EstablishmentId): Promise<void> {
    await this.#repository.publish(establishmentId);
  }

  public async unpublish(establishmentId: EstablishmentId): Promise<void> {
    await this.#repository.unpublish(establishmentId);
  }
}
