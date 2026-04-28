import { inject, Injectable } from '@angular/core';
import { CreateBarDto } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateBar {
  readonly #barRepository = inject(BarRepository);

  public async execute(createBarDto: CreateBarDto) {
    return this.#barRepository.create(createBarDto);
  }
}
