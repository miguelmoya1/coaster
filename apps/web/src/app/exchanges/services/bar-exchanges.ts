import { inject, Injectable } from '@angular/core';
import type { BarId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Injectable({
  providedIn: 'root',
})
export class BarExchanges {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#exchangeRepository.routes.listPending(barId);
  }
}
