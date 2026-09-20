import { inject, Service } from '@angular/core';
import type { EstablishmentId, EstablishmentMemberId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class ResendInvite {
  readonly #memberRepository = inject(MemberRepository);

  public async execute(establishmentId: EstablishmentId, memberId: EstablishmentMemberId) {
    return await this.#memberRepository.resendInvite(establishmentId, memberId);
  }
}
