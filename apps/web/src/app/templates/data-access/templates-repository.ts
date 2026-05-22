import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
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

  public async importToBar(barId: BarId, categoryTemplateIds: string[]) {
    return firstValueFrom(
      this.#http.post(this.routes.import(barId), { categoryTemplateIds })
    );
  }
}
