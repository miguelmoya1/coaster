import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, IImportTemplatesResponse } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TemplatesRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    categories: () => '/templates/categories',
    products: () => '/templates/products',
    import: (barId: BarId) => `/templates/bar/${barId}`,
  };

  public async importToBar(barId: BarId, categoryTemplateIds: string[]): Promise<IImportTemplatesResponse> {
    return firstValueFrom(
      this.#http.post<IImportTemplatesResponse>(this.routes.import(barId), { categoryTemplateIds })
    );
  }
}
