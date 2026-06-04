import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, CreateBarDto } from '@coaster/common';
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

  public async create(createBarDto: CreateBarDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.create, createBarDto));
  }
}
