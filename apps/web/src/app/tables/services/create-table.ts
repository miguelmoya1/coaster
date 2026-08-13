import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class CreateTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(establishmentId: EstablishmentId, dto: CreateTableDto) {
    return await this.#tableRepository.create(establishmentId, dto);
  }
}
