import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class CatalogueRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    starter: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/catalogue`,
    import: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/catalogue/import`,
  };

  public async import(establishmentId: EstablishmentId, categoryKeys?: string[]): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.import(establishmentId), { categoryKeys }));
  }
}
