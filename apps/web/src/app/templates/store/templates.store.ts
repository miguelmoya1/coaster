import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { GetCategoryTemplates } from '../services/get-category-templates';
import { GetProductTemplates } from '../services/get-product-templates';
import { ImportTemplatesToEstablishment } from '../services/import-templates-to-establishment';

@Service()
export class TemplatesStore {
  readonly #getCategoryTemplates = inject(GetCategoryTemplates);
  readonly #getProductTemplates = inject(GetProductTemplates);
  readonly #importTemplatesToEstablishment = inject(ImportTemplatesToEstablishment);

  readonly #categoriesResource = httpResource<ICategoryTemplate[]>(() => this.#getCategoryTemplates.execute());
  readonly #productsResource = httpResource<IProductTemplate[]>(() => this.#getProductTemplates.execute());

  public readonly categories = this.#categoriesResource.asReadonly();
  public readonly products = this.#productsResource.asReadonly();

  public async importToEstablishment(establishmentId: EstablishmentId, categoryTemplateIds: string[]) {
    await this.#importTemplatesToEstablishment.execute(establishmentId, categoryTemplateIds);
  }

  public reloadTemplates() {
    this.#categoriesResource.reload();
    this.#productsResource.reload();
  }
}
