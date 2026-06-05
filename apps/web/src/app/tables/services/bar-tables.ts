import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class BarTables {
  readonly #tableRepository = inject(TableRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#tableRepository.routes.list(barId);
  }
}
