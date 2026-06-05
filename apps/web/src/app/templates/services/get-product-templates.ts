import { inject, Service } from '@angular/core';
import { TemplatesRepository } from '../data-access/templates-repository';

@Service()
export class GetProductTemplates {
  readonly #repository = inject(TemplatesRepository);

  public execute() {
    return this.#repository.routes.products();
  }
}
