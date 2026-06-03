import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { BarId, BarMemberId, InviteBarMemberDto } from '@coaster/common';
import { BarRole } from '@coaster/core';
import { handleErrorFormField, Socket } from '@coaster/core';
import { memberArrayMapper } from '../mappers/member.mapper';
import { BarMembers } from '../services/bar-members';
import { InviteMember } from '../services/invite-member';
import { RemoveMember } from '../services/remove-member';

@Injectable({
  providedIn: 'root',
})
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
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      await this.#inviteMember.execute(barId, inviteDto);
      this.reload();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async remove(memberId: BarMemberId) {
    const barId = this.#currentBarId();
    if (!barId) {
      return handleErrorFormField('NO_BAR_ID_REGISTERED');
    }

    try {
      await this.#removeMember.execute(barId, memberId);
      this.#membersResource.update((members) => {
        if (!members) {
          return undefined;
        }
        return members.filter((m) => m.id !== memberId);
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
