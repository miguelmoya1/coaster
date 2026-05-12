import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Injectable({ providedIn: 'root' })
export class BarMembers {
  readonly #memberRepo = inject(MemberRepository);

  public execute(barId: BarId | undefined) {
    if (!barId) {
      return undefined;
    }

    return this.#memberRepo.routes.list(barId);
  }
}
