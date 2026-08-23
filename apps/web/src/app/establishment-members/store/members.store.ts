import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { EstablishmentId, EstablishmentMemberId, InviteEstablishmentMemberDto } from '@coaster/common';
import { EstablishmentRole, ErrorCodes } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { memberArrayMapper } from '../mappers/member.mapper';
import { EstablishmentMembers } from '../services/establishment-members';
import { InviteMember } from '../services/invite-member';
import { RemoveMember } from '../services/remove-member';
import { UpdateMemberRole } from '../services/update-member-role';

@Service()
export class MembersStore {
  readonly #members = inject(EstablishmentMembers);
  readonly #inviteMember = inject(InviteMember);
  readonly #removeMember = inject(RemoveMember);
  readonly #updateMemberRole = inject(UpdateMemberRole);
  readonly #realtime = inject(Realtime);
  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #membersResource = httpResource(() => this.#members.execute(this.#currentEstablishmentId()), {
    parse: memberArrayMapper,
  });

  public readonly list = this.#membersResource.asReadonly();
  public readonly isOnlyOwner = computed(() => {
    const members = this.list.value();
    if (!members) {
      return false;
    }
    return members.filter((m) => m.role === EstablishmentRole.OWNER).length === 1;
  });
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  constructor() {
    effect(() => {
      const removed = this.#realtime.memberRemoved();
      if (removed) {
        this.#membersResource.update((members) => {
          if (!members) {
            return undefined;
          }
          return members.filter((m) => m.id !== removed.id);
        });
      }
    });

    effect(() => {
      const invited = this.#realtime.memberInvited();
      if (invited) {
        this.reload();
      }
    });

    effect(() => {
      const roleChanged = this.#realtime.memberRoleChanged();
      if (roleChanged) {
        this.reload();
      }
    });
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reload() {
    this.#membersResource.reload();
  }

  public async invite(inviteDto: InviteEstablishmentMemberDto) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#inviteMember.execute(establishmentId, inviteDto);
    this.reload();
  }

  public async updateRole(memberId: EstablishmentMemberId, role: EstablishmentRole) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#updateMemberRole.execute(establishmentId, memberId, role);
    this.reload();
  }

  public async remove(memberId: EstablishmentMemberId) {
    const establishmentId = this.#currentEstablishmentId();
    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#removeMember.execute(establishmentId, memberId);
    this.#membersResource.update((members) => {
      if (!members) {
        return undefined;
      }
      return members.filter((m) => m.id !== memberId);
    });
  }
}
