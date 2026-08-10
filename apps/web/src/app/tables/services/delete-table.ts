import { inject, Service } from '@angular/core';
import type { EstablishmentId, TableId } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class DeleteTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(establishmentId: EstablishmentId, tableId: TableId) {
    return await this.#tableRepository.delete(establishmentId, tableId);
  }
}
