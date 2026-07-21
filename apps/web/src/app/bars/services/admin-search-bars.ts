import { inject, Service } from '@angular/core';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class AdminSearchBars {
  readonly #barRepository = inject(BarRepository);

  public execute(query: string | undefined | null) {
    if (!query || !query.trim()) {
      return undefined;
    }
    return this.#barRepository.routes.adminSearch(query.trim());
  }
}
