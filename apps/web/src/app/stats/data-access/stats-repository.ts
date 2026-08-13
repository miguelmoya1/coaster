import { Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';

@Service()
export class StatsRepository {
  public readonly routes = {
    get: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/stats`,
  };
}
