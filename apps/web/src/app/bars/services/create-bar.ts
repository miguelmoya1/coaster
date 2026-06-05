import { inject, Service } from '@angular/core';
import type { CreateBarDto } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CreateBar {
  readonly #barRepository = inject(BarRepository);

  public async execute(createBarDto: CreateBarDto): Promise<void> {
    await this.#barRepository.create(createBarDto);
  }
}
