import { inject, Injectable } from '@angular/core';
import { BarId, TableId, UpdateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateTable {
  readonly #tableRepository = inject(TableRepository);

  public async update(barId: BarId, tableId: TableId, dto: UpdateTableDto) {
    return await this.#tableRepository.update(barId, tableId, dto);
  }
}
