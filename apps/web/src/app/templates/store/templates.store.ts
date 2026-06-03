import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { GetCategoryTemplates } from '../services/get-category-templates';
import { GetProductTemplates } from '../services/get-product-templates';
import { ImportTemplatesToBar } from '../services/import-templates-to-bar';

@Injectable({
  providedIn: 'root',
})
export class TemplatesStore {
  readonly #getCategoryTemplates = inject(GetCategoryTemplates);
  readonly #getProductTemplates = inject(GetProductTemplates);
  readonly #importTemplatesToBar = inject(ImportTemplatesToBar);

  readonly #categoriesResource = httpResource<ICategoryTemplate[]>(() => this.#getCategoryTemplates.execute());
  readonly #productsResource = httpResource<IProductTemplate[]>(() => this.#getProductTemplates.execute());

  public readonly categories = this.#categoriesResource.asReadonly();
  public readonly products = this.#productsResource.asReadonly();

  public async importToBar(barId: BarId, categoryTemplateIds: string[]) {
    try {
      const counts = await this.#importTemplatesToBar.execute(barId, categoryTemplateIds);
      return { counts, err: null };
    } catch (error) {
      return { counts: null, err: handleErrorFormField(error) };
    }
  }

  public reloadTemplates() {
    this.#categoriesResource.reload();
    this.#productsResource.reload();
  }
}

