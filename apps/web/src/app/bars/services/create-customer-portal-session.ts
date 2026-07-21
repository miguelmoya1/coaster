import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CreateCustomerPortalSession {
  readonly #barRepository = inject(BarRepository);

  public async execute(barId: BarId | undefined, returnUrl: string): Promise<string | undefined> {
    if (!barId) {
      return undefined;
    }

    try {
      const { url } = await this.#barRepository.createCustomerPortalSession(barId, { returnUrl });
      return url;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
