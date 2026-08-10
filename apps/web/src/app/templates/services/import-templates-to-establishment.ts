import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { TemplatesRepository } from '../data-access/templates-repository';

@Service()
export class ImportTemplatesToEstablishment {
  readonly #repository = inject(TemplatesRepository);

  public async execute(establishmentId: EstablishmentId, categoryTemplateIds: string[]): Promise<void> {
    return await this.#repository.importToEstablishment(establishmentId, categoryTemplateIds);
  }
}
