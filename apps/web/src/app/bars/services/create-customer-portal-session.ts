import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CreateCustomerPortalSession {
  readonly #barRepository = inject(BarRepository);

  public async execute(barId: BarId | undefined): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    const { url } = await this.#barRepository.createCustomerPortalSession(barId, {});
    return url;
  }
}
