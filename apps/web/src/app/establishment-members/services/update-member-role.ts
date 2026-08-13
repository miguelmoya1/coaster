import { inject, Service } from '@angular/core';
import type { EstablishmentId, EstablishmentMemberId, EstablishmentRole } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class UpdateMemberRole {
  readonly #memberRepository = inject(MemberRepository);

  public async execute(establishmentId: EstablishmentId, memberId: EstablishmentMemberId, role: EstablishmentRole) {
    return await this.#memberRepository.updateRole(establishmentId, memberId, role);
  }
}
