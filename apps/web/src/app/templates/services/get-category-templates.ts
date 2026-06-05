import { inject, Service } from '@angular/core';
import { TemplatesRepository } from '../data-access/templates-repository';

@Service()
export class GetCategoryTemplates {
  readonly #repository = inject(TemplatesRepository);

  public execute() {
    return this.#repository.routes.categories();
  }
}
