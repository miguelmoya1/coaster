import { inject, Service } from '@angular/core';
import type { EstablishmentId, TableId, UpdateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class UpdateTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(establishmentId: EstablishmentId, tableId: TableId, dto: UpdateTableDto) {
    return await this.#tableRepository.update(establishmentId, tableId, dto);
  }
}
