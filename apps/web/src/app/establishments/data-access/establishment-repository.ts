import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateEstablishmentDto } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class EstablishmentRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    myEstablishments: '/establishments',
    establishment: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}`,
    create: '/establishments',
  };

  public async create(createEstablishmentDto: CreateEstablishmentDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.create, createEstablishmentDto));
  }
}
