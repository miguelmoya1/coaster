import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, EstablishmentStats } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class StatsRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    get: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/stats`,
  };

  public async getStats(establishmentId: EstablishmentId): Promise<EstablishmentStats> {
    return firstValueFrom(this.#http.get<EstablishmentStats>(this.routes.get(establishmentId)));
  }
}
