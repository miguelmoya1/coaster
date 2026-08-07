import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarPermission, BarRole, hasPermission } from '@coaster/common';
import { memberMapper } from '../mappers/member.mapper';
import { MyMember } from '../services/my-member';

@Service()
export class MyMemberStore {
  readonly #myMember = inject(MyMember);
  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentBarId()), {
    parse: (member) => memberMapper(member),
  });

  public readonly myMember = this.#myMemberResource.asReadonly();
  public readonly currentBarId = this.#currentBarId.asReadonly();

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

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadMyMember() {
    this.#myMemberResource.reload();
  }
}
