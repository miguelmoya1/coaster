import { inject, Injectable } from '@angular/core';
import { TemplatesRepository } from '../data-access/templates-repository';

@Injectable({
  providedIn: 'root',
})
export class GetProductTemplates {
  readonly #repository = inject(TemplatesRepository);

  public execute() {
    return this.#repository.routes.products();
  }
}
