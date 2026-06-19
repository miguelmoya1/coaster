import { inject, Service } from '@angular/core';
import { BarRepository } from '../data-access/bar-repository';
import { barArrayMapper } from '../mappers/bar.mapper';
import { Bar } from '@coaster/common';

@Service()
export class SearchAdminBars {
  readonly #repository = inject(BarRepository);

  public async execute(query: string): Promise<Bar[]> {
    if (!query || !query.trim()) return [];
    const dtos = await this.#repository.searchAdmin(query);
    return barArrayMapper(dtos);
  }
}
