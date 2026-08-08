import { inject, Service } from '@angular/core';
import type { BarId, BarMemberId, BarRole } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class UpdateMemberRole {
  readonly #memberRepository = inject(MemberRepository);

  public async execute(barId: BarId, memberId: BarMemberId, role: BarRole) {
    return await this.#memberRepository.updateRole(barId, memberId, role);
  }
}
