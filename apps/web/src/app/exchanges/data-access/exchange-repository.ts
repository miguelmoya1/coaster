import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateShiftExchangeDto, ShiftExchangeId, ShiftId } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class ExchangeRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    listPending: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/exchanges`,
    request: (establishmentId: EstablishmentId, shiftId: ShiftId) =>
      `/establishments/${establishmentId}/shifts/${shiftId}/exchanges`,
    accept: (establishmentId: EstablishmentId, exchangeId: ShiftExchangeId) =>
      `/establishments/${establishmentId}/exchanges/${exchangeId}/accept`,
    delete: (establishmentId: EstablishmentId, exchangeId: ShiftExchangeId) =>
      `/establishments/${establishmentId}/exchanges/${exchangeId}`,
  };

  public async request(establishmentId: EstablishmentId, shiftId: ShiftId, dto: CreateShiftExchangeDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.request(establishmentId, shiftId), dto));
  }

  public async accept(establishmentId: EstablishmentId, exchangeId: ShiftExchangeId): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.accept(establishmentId, exchangeId), {}));
  }

  public async delete(establishmentId: EstablishmentId, exchangeId: ShiftExchangeId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.delete(establishmentId, exchangeId)));
  }
}
