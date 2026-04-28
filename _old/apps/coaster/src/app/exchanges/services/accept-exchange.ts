import { inject, Injectable } from '@angular/core';
import { BarId, ShiftExchangeId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Injectable({
  providedIn: 'root',
})
export class AcceptExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(barId: BarId, exchangeId: ShiftExchangeId) {
    return await this.#exchangeRepository.accept(barId, exchangeId);
  }
}
