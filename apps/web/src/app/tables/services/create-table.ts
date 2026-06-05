import { inject, Service } from '@angular/core';
import type { BarId, CreateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Service()
export class CreateTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(barId: BarId, dto: CreateTableDto) {
    return await this.#tableRepository.create(barId, dto);
  }
}
