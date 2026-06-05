import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { TemplatesRepository } from '../data-access/templates-repository';

@Service()
export class ImportTemplatesToBar {
  readonly #repository = inject(TemplatesRepository);

  public async execute(barId: BarId, categoryTemplateIds: string[]): Promise<void> {
    return await this.#repository.importToBar(barId, categoryTemplateIds);
  }
}
