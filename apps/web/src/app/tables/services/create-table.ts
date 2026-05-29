import { inject, Injectable } from '@angular/core';
import { BarId, CreateTableDto } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateTable {
  readonly #tableRepository = inject(TableRepository);

  public async execute(barId: BarId, dto: CreateTableDto) {
    return await this.#tableRepository.create(barId, dto);
  }
}
