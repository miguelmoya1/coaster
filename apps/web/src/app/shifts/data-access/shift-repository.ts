import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, CreateShiftDto, Shift } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { shiftMapper } from '../mappers/shift.mapper';

@Injectable({
  providedIn: 'root',
})
export class ShiftRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId, startDate: string, endDate: string) =>
      `/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`,
    create: (barId: BarId) => `/bars/${barId}/shifts`,
    delete: (barId: BarId, shiftId: string) => `/bars/${barId}/shifts/${shiftId}`,
  };

  public async create(barId: BarId, createShiftDto: CreateShiftDto): Promise<void> {
    return firstValueFrom(
      this.#http.post<void>(this.routes.create(barId), createShiftDto)
    );
  }

  public async delete(barId: BarId, shiftId: string): Promise<void> {
    return firstValueFrom(
      this.#http.delete<void>(this.routes.delete(barId, shiftId))
    );
  }
}
