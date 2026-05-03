import { inject, Injectable } from '@angular/core';
import { BarId, TableId } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteTable {
  readonly #tableRepository = inject(TableRepository);

  public async delete(barId: BarId, tableId: TableId) {
    return await this.#tableRepository.delete(barId, tableId);
  }
}
