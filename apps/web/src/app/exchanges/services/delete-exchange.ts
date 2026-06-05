import { inject, Service } from '@angular/core';
import type { BarId, ShiftExchangeId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class DeleteExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(barId: BarId, exchangeId: ShiftExchangeId) {
    return await this.#exchangeRepository.delete(barId, exchangeId);
  }
}
