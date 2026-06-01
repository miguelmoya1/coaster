import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { StatsRepository } from '../data-access/stats-repository';

@Injectable({
  providedIn: 'root',
})
export class BarStats {
  readonly #statsRepository = inject(StatsRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#statsRepository.routes.get(barId);
  }
}
