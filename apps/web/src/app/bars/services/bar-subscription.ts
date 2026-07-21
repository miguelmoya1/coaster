import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class BarSubscription {
  readonly #barRepository = inject(BarRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#barRepository.routes.getSubscription(barId);
  }
}
