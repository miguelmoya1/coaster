import { Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/core';

@Service()
export class StatsRepository {
  public readonly routes = {
    get: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/stats`,
  };
}
