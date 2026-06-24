import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { Bar, BarId, CreateBarDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class BarRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    myBars: '/bars',
    bar: (barId: BarId) => `/bars/${barId}`,
    create: '/bars',
    adminSearch: (query: string) => `/bars/admin/search?q=${query}`,
  };

  public async create(createBarDto: CreateBarDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.create, createBarDto));
  }

  public async searchAdmin(query: string): Promise<Bar[]> {
    return await firstValueFrom(this.#http.get<Bar[]>(this.routes.adminSearch(query)));
  }
}
