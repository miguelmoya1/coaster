import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { BarId, CreateShiftExchangeDto, ShiftExchangeId, ShiftId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';

import { exchangeArrayMapper } from '../mappers/exchange.mapper';
import { AcceptExchange } from '../services/accept-exchange';
import { BarExchanges } from '../services/bar-exchanges';
import { DeleteExchange } from '../services/delete-exchange';
import { RequestExchange } from '../services/request-exchange';

@Service()
export class ExchangesStore {
  readonly #barExchanges = inject(BarExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);
  readonly #deleteExchange = inject(DeleteExchange);

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
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#acceptExchange.execute(barId, exchangeId);
    this.reload();
  }

  public async request(shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reload();
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#requestExchange.execute(barId, shiftId, dto);
    this.reload();
  }

  public async delete(exchangeId: ShiftExchangeId) {
    const barId = this.#currentBarId();
    if (!barId) {
      this.reload();
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#deleteExchange.execute(barId, exchangeId);
    this.reload();
  }
}
