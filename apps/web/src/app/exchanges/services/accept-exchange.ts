import { inject, Service } from '@angular/core';
import type { EstablishmentId, ShiftExchangeId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class AcceptExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(establishmentId: EstablishmentId, exchangeId: ShiftExchangeId) {
    return await this.#exchangeRepository.accept(establishmentId, exchangeId);
  }
}
