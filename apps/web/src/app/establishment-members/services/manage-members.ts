import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/core';
import type { EstablishmentMemberId, InviteEstablishmentMemberDto } from '../models/establishment-member.interface';
import type { EstablishmentRole } from '@coaster/establishments';
import { MemberRepository } from '../data-access/member-repository';

@Service()
export class ManageMembers {
  readonly #repository = inject(MemberRepository);

  public async invite(establishmentId: EstablishmentId, dto: InviteEstablishmentMemberDto): Promise<void> {
    await this.#repository.invite(establishmentId, dto);
  }

  public async resendInvite(establishmentId: EstablishmentId, memberId: EstablishmentMemberId): Promise<void> {
    await this.#repository.resendInvite(establishmentId, memberId);
  }

  public async updateRole(
    establishmentId: EstablishmentId,
    memberId: EstablishmentMemberId,
    role: EstablishmentRole,
  ): Promise<void> {
    await this.#repository.updateRole(establishmentId, memberId, role);
  }

  public async remove(establishmentId: EstablishmentId, memberId: EstablishmentMemberId): Promise<void> {
    await this.#repository.remove(establishmentId, memberId);
  }
}
