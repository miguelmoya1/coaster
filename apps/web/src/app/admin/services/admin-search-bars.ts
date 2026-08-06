import { inject, Service } from '@angular/core';
import { AdminRepository } from '../data-access/admin-repository';

@Service()
export class AdminSearchBars {
  readonly #adminRepository = inject(AdminRepository);

  public execute(query: string | undefined | null) {
    if (!query || !query.trim()) {
      return undefined;
    }
    return this.#adminRepository.routes.searchBars(query.trim());
  }
}
