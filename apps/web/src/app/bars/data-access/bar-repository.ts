import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, CreateBarDto, CreateResponse } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

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

  public async create(createBarDto: CreateBarDto): Promise<CreateResponse<BarId>> {
    return firstValueFrom(this.#http.post<CreateResponse<BarId>>(this.routes.create, createBarDto));
  }
}
