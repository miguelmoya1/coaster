import { inject, Injectable } from '@angular/core';
import { TemplatesRepository } from '../data-access/templates-repository';

@Injectable({
  providedIn: 'root',
})
export class GetCategoryTemplates {
  readonly #repository = inject(TemplatesRepository);

  public execute() {
    return this.#repository.routes.categories();
  }
}
