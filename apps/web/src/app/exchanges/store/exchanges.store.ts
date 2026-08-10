import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { EstablishmentId, CreateShiftExchangeDto, ShiftExchangeId, ShiftId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';

import { exchangeArrayMapper } from '../mappers/exchange.mapper';
import { AcceptExchange } from '../services/accept-exchange';
import { EstablishmentExchanges } from '../services/establishment-exchanges';
import { DeleteExchange } from '../services/delete-exchange';
import { RequestExchange } from '../services/request-exchange';

@Service()
export class ExchangesStore {
  readonly #establishmentExchanges = inject(EstablishmentExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);
  readonly #deleteExchange = inject(DeleteExchange);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #exchangesResource = httpResource(
    () => this.#establishmentExchanges.execute(this.#currentEstablishmentId()),
    {
      parse: exchangeArrayMapper,
    },
  );

  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
  public readonly exchanges = this.#exchangesResource.asReadonly();

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reload() {
    this.#exchangesResource.reload();
  }

  public async accept(exchangeId: ShiftExchangeId) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reload();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#acceptExchange.execute(establishmentId, exchangeId);
    this.reload();
  }

  public async request(shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reload();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#requestExchange.execute(establishmentId, shiftId, dto);
    this.reload();
  }

  public async delete(exchangeId: ShiftExchangeId) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      this.reload();
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#deleteExchange.execute(establishmentId, exchangeId);
    this.reload();
  }
}
