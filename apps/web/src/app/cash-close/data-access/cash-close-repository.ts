import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { CashClose, CloseCashDto, EstablishmentId } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class CashCloseRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/cash-closes`,
    preview: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/cash-closes/preview`,
  };

  public async close(establishmentId: EstablishmentId, dto: CloseCashDto): Promise<CashClose> {
    return firstValueFrom(this.#http.post<CashClose>(this.routes.list(establishmentId), dto));
  }
}
