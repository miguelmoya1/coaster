import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId, BarMemberId, InviteBarMemberDto } from '@coaster/common';
import { BarRole, ErrorCodes } from '@coaster/common';
import { Socket } from '@coaster/core';
import { memberArrayMapper } from '../mappers/member.mapper';
import { BarMembers } from '../services/bar-members';
import { InviteMember } from '../services/invite-member';
import { RemoveMember } from '../services/remove-member';

@Service()
export class MembersStore {
  readonly #members = inject(BarMembers);
  readonly #inviteMember = inject(InviteMember);
  readonly #removeMember = inject(RemoveMember);
  readonly #socketService = inject(Socket);
  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #membersResource = httpResource(() => this.#members.execute(this.#currentBarId()), {
    parse: memberArrayMapper,
  });

  public readonly list = this.#membersResource.asReadonly();
  public readonly isOnlyOwner = computed(() => {
    const members = this.list.value();
    if (!members) {
      return false;
    }
    return members.filter((m) => m.role === BarRole.OWNER).length === 1;
  });
  public readonly currentBarId = this.#currentBarId.asReadonly();

  constructor() {
    effect(() => {
      const removed = this.#socketService.memberRemoved();
      if (removed) {
        this.#membersResource.update((members) => {
          if (!members) {
            return undefined;
          }
          return members.filter((m) => m.id !== removed.id);
        });
      }
    });

    // Member invited
    effect(() => {
      const invited = this.#socketService.memberInvited();
      if (invited) {
        this.reload();
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reload() {
    this.#membersResource.reload();
  }

  public async invite(inviteDto: InviteBarMemberDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#inviteMember.execute(barId, inviteDto);
    this.reload();
  }

  public async remove(memberId: BarMemberId) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    await this.#removeMember.execute(barId, memberId);
    this.#membersResource.update((members) => {
      if (!members) {
        return undefined;
      }
      return members.filter((m) => m.id !== memberId);
    });
  }
}
