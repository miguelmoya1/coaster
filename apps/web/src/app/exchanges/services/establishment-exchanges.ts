import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class EstablishmentExchanges {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#exchangeRepository.routes.listPending(establishmentId);
  }
}
