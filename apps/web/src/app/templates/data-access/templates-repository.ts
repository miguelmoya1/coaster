import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class TemplatesRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    categories: () => '/templates/categories',
    products: () => '/templates/products',
    import: (establishmentId: EstablishmentId) => `/templates/establishment/${establishmentId}`,
  };

  public async importToEstablishment(establishmentId: EstablishmentId, categoryTemplateIds: string[]): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.import(establishmentId), { categoryTemplateIds }));
  }
}
