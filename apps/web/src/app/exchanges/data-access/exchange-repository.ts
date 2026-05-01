import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateShiftExchangeDto, ShiftExchange, ShiftExchangeId, ShiftId } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { exchangeMapper } from '../mappers/exchange.mapper';

@Injectable({
  providedIn: 'root',
})
export class ExchangeRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    listPending: (barId: BarId) => `/bars/${barId}/exchanges`,
    request: (barId: BarId, shiftId: ShiftId) => `/bars/${barId}/shifts/${shiftId}/exchanges`,
    accept: (barId: BarId, exchangeId: ShiftExchangeId) => `/bars/${barId}/exchanges/${exchangeId}/accept`,
  };

  public async request(barId: BarId, shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    return firstValueFrom(
      this.#http
        .post<ShiftExchange>(this.routes.request(barId, shiftId), dto)
        .pipe(map((exchange) => exchangeMapper(exchange))),
    );
  }

  public async accept(barId: BarId, exchangeId: ShiftExchangeId) {
    return firstValueFrom(
      this.#http
        .patch<ShiftExchange>(this.routes.accept(barId, exchangeId), {})
        .pipe(map((exchange) => exchangeMapper(exchange))),
    );
  }
}
