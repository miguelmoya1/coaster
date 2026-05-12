import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId, CreateShiftExchangeDto, ShiftExchangeId, ShiftId } from '@coaster/common';
import { handleErrorFormField } from '../../core';
import { exchangeArrayMapper } from '../mappers/exchange.mapper';
import { AcceptExchange } from '../services/accept-exchange';
import { BarExchanges } from '../services/bar-exchanges';
import { RequestExchange } from '../services/request-exchange';

@Injectable({
  providedIn: 'root',
})
export class ExchangesStore {
  readonly #barExchanges = inject(BarExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #exchangesResource = httpResource(() => this.#barExchanges.execute(this.#currentBarId()), {
    parse: exchangeArrayMapper,
  });

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly exchanges = this.#exchangesResource.asReadonly();

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reload() {
    this.#exchangesResource.reload();
  }

  public async accept(exchangeId: ShiftExchangeId) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reload();
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      const exchange = await this.#acceptExchange.execute(barId, exchangeId);

      if (!this.#exchangesResource.hasValue()) {
        this.#exchangesResource.set([exchange]);
        return null;
      }

      const currentExchanges = this.#exchangesResource.value();

      if (!currentExchanges) {
        this.#exchangesResource.set([exchange]);
        return null;
      }

      this.#exchangesResource.update((exchanges) => exchanges.map((e) => (e.id === exchange.id ? exchange : e)));

      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async request(shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reload();
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      const exchange = await this.#requestExchange.execute(barId, shiftId, dto);

      if (!this.#exchangesResource.hasValue()) {
        this.#exchangesResource.set([exchange]);
        return null;
      }

      const currentExchanges = this.#exchangesResource.value();

      if (!currentExchanges) {
        this.#exchangesResource.set([exchange]);
        return null;
      }

      this.#exchangesResource.update((exchanges) => exchanges.map((e) => (e.id === exchange.id ? exchange : e)));

      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
