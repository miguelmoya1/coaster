import { inject, Injectable } from '@angular/core';
import { BarId, InviteBarMemberDto } from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';

@Injectable({ providedIn: 'root' })
export class InviteMember {
  readonly #memberRepo = inject(MemberRepository);

  public async invite(barId: BarId, dto: InviteBarMemberDto) {
    return this.#memberRepo.invite(barId, dto);
  }
}
