import { inject, Service } from '@angular/core';
import type { CreateTableDto, EstablishmentId, TableId, UpdateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class ManageTables {
  readonly #repository = inject(TableRepository);

  public async create(establishmentId: EstablishmentId, dto: CreateTableDto): Promise<void> {
    await this.#repository.create(establishmentId, dto);
  }

  public async update(establishmentId: EstablishmentId, tableId: TableId, dto: UpdateTableDto): Promise<void> {
    await this.#repository.update(establishmentId, tableId, dto);
  }

  public async delete(establishmentId: EstablishmentId, tableId: TableId): Promise<void> {
    await this.#repository.delete(establishmentId, tableId);
  }
}
