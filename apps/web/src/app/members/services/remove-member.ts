import { inject, Service } from '@angular/core';
import type { BarId, BarMemberId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class RemoveMember {
  readonly #memberRepository = inject(MemberRepository);

  public async execute(barId: BarId, memberId: BarMemberId) {
    return await this.#memberRepository.remove(barId, memberId);
  }
}
