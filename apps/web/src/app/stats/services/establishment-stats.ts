import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { StatsRepository } from '../data-access/stats-repository';

@Service()
export class EstablishmentStats {
  readonly #statsRepository = inject(StatsRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#statsRepository.routes.get(establishmentId);
  }
}
