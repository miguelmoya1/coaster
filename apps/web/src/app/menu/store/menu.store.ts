import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { EstablishmentId, MenuDraft as Draft, SaveMenuDraftDto } from '@coaster/common';
import { MenuRepository } from '../data-access/menu-repository';
import { MenuDraft } from '../services/menu-draft';

@Service()
export class MenuStore {
  readonly #menuDraft = inject(MenuDraft);
  readonly #repository = inject(MenuRepository);

  readonly #currentEstablishmentId = signal<EstablishmentId | null>(null);
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  readonly #draftResource = httpResource<Draft>(() => this.#menuDraft.execute(this.#currentEstablishmentId()));

  public readonly draft = this.#draftResource.asReadonly();

  public setEstablishmentId(establishmentId: EstablishmentId) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public async save(establishmentId: EstablishmentId, dto: SaveMenuDraftDto) {
    const saved = await this.#repository.save(establishmentId, dto);

    this.#draftResource.set(saved);

    return saved;
  }

  public async publish(establishmentId: EstablishmentId) {
    await this.#repository.publish(establishmentId);
    this.#draftResource.reload();
  }

  public async unpublish(establishmentId: EstablishmentId) {
    await this.#repository.unpublish(establishmentId);
    this.#draftResource.reload();
  }
}
