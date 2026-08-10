import { inject, Service } from '@angular/core';
import type { CreateEstablishmentDto } from '@coaster/common';
import { EstablishmentRepository } from '../data-access/establishment-repository';

@Service()
export class CreateEstablishment {
  readonly #establishmentRepository = inject(EstablishmentRepository);

  public async execute(createEstablishmentDto: CreateEstablishmentDto): Promise<void> {
    await this.#establishmentRepository.create(createEstablishmentDto);
  }
}
