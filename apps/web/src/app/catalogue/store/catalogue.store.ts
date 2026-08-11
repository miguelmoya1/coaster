import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { EstablishmentId, StarterCatalogueCategory } from '@coaster/common';
import { ImportStarterCatalogue } from '../services/import-starter-catalogue';
import { StarterCatalogue } from '../services/starter-catalogue';

@Service()
export class CatalogueStore {
  readonly #starterCatalogue = inject(StarterCatalogue);
  readonly #importStarterCatalogue = inject(ImportStarterCatalogue);

  readonly #currentEstablishmentId = signal<EstablishmentId | null>(null);
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  readonly #starterResource = httpResource<StarterCatalogueCategory[]>(() =>
    this.#starterCatalogue.execute(this.#currentEstablishmentId()),
  );

  public readonly starter = this.#starterResource.asReadonly();

  public setEstablishmentId(establishmentId: EstablishmentId) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public async import(establishmentId: EstablishmentId, categoryKeys?: string[]) {
    await this.#importStarterCatalogue.execute(establishmentId, categoryKeys);
  }
}
