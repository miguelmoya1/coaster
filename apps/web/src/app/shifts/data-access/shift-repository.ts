import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateShiftDto, Shift } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class ShiftRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId, startDate: string, endDate: string) =>
      `/establishments/${establishmentId}/shifts?startDate=${startDate}&endDate=${endDate}`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/shifts`,
    delete: (establishmentId: EstablishmentId, shiftId: string) =>
      `/establishments/${establishmentId}/shifts/${shiftId}`,
  };

  public async listBetween(establishmentId: EstablishmentId, startDate: string, endDate: string): Promise<Shift[]> {
    return firstValueFrom(this.#http.get<Shift[]>(this.routes.list(establishmentId, startDate, endDate)));
  }

  public async create(establishmentId: EstablishmentId, createShiftDto: CreateShiftDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(establishmentId), createShiftDto));
  }

  public async delete(establishmentId: EstablishmentId, shiftId: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.delete(establishmentId, shiftId)));
  }
}
