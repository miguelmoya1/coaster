import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateBarDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { barMapper } from '../mappers/bar.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    myBars: '/bars',
    bar: (barId: BarId) => `/bars/${barId}`,
    create: '/bars',
  };

  public async create(createBarDto: CreateBarDto) {
    return firstValueFrom(this.#http.post(this.routes.create, createBarDto).pipe(map((bar) => barMapper(bar))));
  }
}
