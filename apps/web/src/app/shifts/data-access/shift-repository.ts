import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateShiftDto, Shift } from '@coaster/common';
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

  public async create(barId: BarId, createShiftDto: CreateShiftDto) {
    return firstValueFrom(
      this.#http.post<Shift>(this.routes.create(barId), createShiftDto).pipe(map((shift) => shiftMapper(shift))),
    );
  }

  public async delete(barId: BarId, shiftId: string) {
    return firstValueFrom(
      this.#http.delete<{ success: boolean }>(this.routes.delete(barId, shiftId)),
    );
  }
}
