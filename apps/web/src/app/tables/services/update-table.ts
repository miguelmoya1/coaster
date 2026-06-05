import { inject, Service } from '@angular/core';
import type { BarId, TableId, UpdateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class UpdateTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(barId: BarId, tableId: TableId, dto: UpdateTableDto) {
    return await this.#tableRepository.update(barId, tableId, dto);
  }
}
