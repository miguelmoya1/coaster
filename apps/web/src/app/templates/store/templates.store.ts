import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TemplatesRepository } from '../data-access/templates-repository';

@Injectable({
  providedIn: 'root',
})
export class TemplatesStore {
  readonly #repository = inject(TemplatesRepository);

  readonly #categoriesResource = httpResource<ICategoryTemplate[]>(() => this.#repository.routes.categories());
  readonly #productsResource = httpResource<IProductTemplate[]>(() => this.#repository.routes.products());

  public readonly categories = this.#categoriesResource.asReadonly();
  public readonly products = this.#productsResource.asReadonly();

  public async importToBar(barId: BarId, categoryTemplateIds: string[]) {
    try {
      await this.#repository.importToBar(barId, categoryTemplateIds);
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public reloadTemplates() {
    this.#categoriesResource.reload();
    this.#productsResource.reload();
  }
}
