import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CurrentBar } from '../../bars';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { exchangeArrayMapper } from '../mappers/exchange.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarExchanges {
  readonly #exchangeRepository = inject(ExchangeRepository);
  readonly #currentBar = inject(CurrentBar);

  readonly #pending = httpResource(
    () => {
      const barId = this.#currentBar.currentId();
      if (!barId) {
        return undefined;
      }
      return this.#exchangeRepository.routes.listPending(barId);
    },
    {
      parse: (exchanges) => exchangeArrayMapper(exchanges),
    },
  );

  readonly pending = this.#pending.asReadonly();

  public reload() {
    this.#pending.reload();
  }
}
