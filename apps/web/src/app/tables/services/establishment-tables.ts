import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class EstablishmentTables {
  readonly #tableRepository = inject(TableRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#tableRepository.routes.list(establishmentId);
  }
}
