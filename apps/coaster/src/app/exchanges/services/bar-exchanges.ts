import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { exchangeArrayMapper } from '../mappers/exchange.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarExchanges {
  readonly #exchangeRepository = inject(ExchangeRepository);
  readonly #barId = signal<BarId | undefined>(undefined);

  readonly #pending = httpResource(
    () => {
      const barId = this.#barId();
      if (!barId) {
        return undefined;
      }
      return this.#exchangeRepository.routes.listPending(barId);
    },
    {
      parse: exchangeArrayMapper,
    },
  );

  readonly pending = this.#pending.asReadonly();

  public setBarContext(barId: BarId) {
    this.#barId.set(barId);
  }

  public reload() {
    this.#pending.reload();
  }
}
