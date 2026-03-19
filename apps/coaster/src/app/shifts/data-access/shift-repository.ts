import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateShiftDto, Shift } from '@coaster/interfaces';
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
  };

  public async create(barId: BarId, createShiftDto: CreateShiftDto) {
    return firstValueFrom(
      this.#http
        .post<Shift>(this.routes.create(barId), createShiftDto)
        .pipe(map(shiftMapper)),
    );
  }
}
