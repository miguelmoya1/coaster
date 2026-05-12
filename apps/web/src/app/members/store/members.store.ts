import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId, BarMemberId, InviteBarMemberDto } from '@coaster/common';
import { handleErrorFormField } from '../../core';
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
  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #membersResource = httpResource(() => this.#members.execute(this.#currentBarId()), {
    parse: memberArrayMapper,
  });

  public readonly list = this.#membersResource.asReadonly();
  public readonly currentBarId = this.#currentBarId.asReadonly();

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
      const member = await this.#inviteMember.execute(barId, inviteDto);

      if (!this.#membersResource.hasValue()) {
        this.#membersResource.set([member]);
        return null;
      }

      const members = this.#membersResource.value();

      if (!members) {
        this.#membersResource.set([member]);
        return null;
      }

      this.#membersResource.update((members) => [...members, member]);
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

      const members = this.#membersResource.value();
      if (!members) {
        return null;
      }

      this.#membersResource.set(members.filter((m) => m.id !== memberId));
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
