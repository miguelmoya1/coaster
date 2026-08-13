import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class MyMember {
  readonly #memberRepository = inject(MemberRepository);
  readonly #auth = inject(Auth);

  public execute(id: EstablishmentId | undefined) {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return undefined;
    }

    if (!id) {
      return undefined;
    }

    return this.#memberRepository.routes.me(id);
  }
}
