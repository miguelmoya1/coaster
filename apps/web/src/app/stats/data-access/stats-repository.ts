import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, BarStats } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StatsRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    get: (barId: BarId) => `/bars/${barId}/stats`,
  };

  public async getStats(barId: BarId): Promise<BarStats> {
    return firstValueFrom(
      this.#http.get<BarStats>(this.routes.get(barId))
    );
  }
}
