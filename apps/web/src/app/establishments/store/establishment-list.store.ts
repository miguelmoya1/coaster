import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { CreateEstablishmentDto } from '@coaster/common';
import { establishmentArrayMapper } from '../mappers/establishment.mapper';
import { CreateEstablishment } from '../services/create-establishment';
import { MyEstablishments } from '../services/my-establishments';

@Service()
export class EstablishmentListStore {
  readonly #createEstablishment = inject(CreateEstablishment);
  readonly #myEstablishments = inject(MyEstablishments);

  readonly #myEstablishmentsResource = httpResource(() => this.#myEstablishments.execute(), {
    parse: (establishments) => establishmentArrayMapper(establishments),
  });

  public readonly list = this.#myEstablishmentsResource.asReadonly();

  public reloadMyEstablishments() {
    this.#myEstablishmentsResource.reload();
  }

  public async create(createEstablishmentDto: CreateEstablishmentDto) {
    await this.#createEstablishment.execute(createEstablishmentDto);
    this.reloadMyEstablishments();
  }
}
