import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { StatsRepository } from '../data-access/stats-repository';

@Service()
export class BarStats {
  readonly #statsRepository = inject(StatsRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#statsRepository.routes.get(barId);
  }
}
