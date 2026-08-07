import { inject, Service } from '@angular/core';
import type { BarId, InviteBarMemberDto } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class InviteMember {
  readonly #memberRepo = inject(MemberRepository);

  public async execute(barId: BarId, inviteDto: InviteBarMemberDto) {
    return this.#memberRepo.invite(barId, inviteDto);
  }
}
