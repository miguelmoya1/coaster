import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class EstablishmentMembers {
  readonly #memberRepo = inject(MemberRepository);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#memberRepo.routes.list(establishmentId);
  }
}
