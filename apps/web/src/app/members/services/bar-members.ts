import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class BarMembers {
  readonly #memberRepo = inject(MemberRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#memberRepo.routes.list(barId);
  }
}
