import { inject, Service } from '@angular/core';
import type { EstablishmentId, InviteEstablishmentMemberDto } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class InviteMember {
  readonly #memberRepo = inject(MemberRepository);

  public async execute(establishmentId: EstablishmentId, inviteDto: InviteEstablishmentMemberDto) {
    return this.#memberRepo.invite(establishmentId, inviteDto);
  }
}
