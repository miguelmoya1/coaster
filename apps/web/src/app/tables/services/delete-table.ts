import { inject, Service } from '@angular/core';
import type { BarId, TableId } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class DeleteTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(barId: BarId, tableId: TableId) {
    return await this.#tableRepository.delete(barId, tableId);
  }
}
