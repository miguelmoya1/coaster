import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, CreateShiftExchangeDto, ShiftExchange, ShiftExchangeId, ShiftId } from '@coaster/common';
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
    delete: (barId: BarId, exchangeId: ShiftExchangeId) => `/bars/${barId}/exchanges/${exchangeId}`,
  };

  public async request(barId: BarId, shiftId: ShiftId, dto: CreateShiftExchangeDto): Promise<void> {
    return firstValueFrom(
      this.#http.post<void>(this.routes.request(barId, shiftId), dto)
    );
  }

  public async accept(barId: BarId, exchangeId: ShiftExchangeId): Promise<void> {
    return firstValueFrom(
      this.#http.patch<void>(this.routes.accept(barId, exchangeId), {})
    );
  }

  public async delete(barId: BarId, exchangeId: ShiftExchangeId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.delete(barId, exchangeId)));
  }
}
