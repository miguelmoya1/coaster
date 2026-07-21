import { httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { BarPermission, BarRole } from '@coaster/common';
import { hasPermission } from '@coaster/core';
import { memberMapper } from '@coaster/members';
import { MyMember } from '../services/my-member';
import { CurrentBarStore } from './current-bar.store';

@Service()
export class MyMemberStore {
  readonly #myMember = inject(MyMember);
  readonly #currentBarStore = inject(CurrentBarStore);

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentBarStore.currentId()), {
    parse: (member) => memberMapper(member),
  });

  public readonly myMember = this.#myMemberResource.asReadonly();

  public readonly isOwner = computed(() => {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member?.role === BarRole.OWNER;
  });

  public hasPermission(permission: BarPermission): boolean {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member ? hasPermission(member.role, permission) : false;
  }

  public reloadMyMember() {
    this.#myMemberResource.reload();
  }
}
