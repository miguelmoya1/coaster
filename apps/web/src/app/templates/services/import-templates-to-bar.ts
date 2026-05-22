import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { TemplatesRepository } from '../data-access/templates-repository';

@Injectable({
  providedIn: 'root',
})
export class ImportTemplatesToBar {
  readonly #repository = inject(TemplatesRepository);

  public async execute(barId: BarId, categoryTemplateIds: string[]) {
    return await this.#repository.importToBar(barId, categoryTemplateIds);
  }
}
