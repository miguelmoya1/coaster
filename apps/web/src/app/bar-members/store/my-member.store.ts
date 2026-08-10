import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId } from '@coaster/common';
import { BarPermission, BarRole, hasPermission } from '@coaster/common';
import { Socket } from '@coaster/core';
import { memberMapper } from '../mappers/member.mapper';
import { MyMember } from '../services/my-member';

@Service()
export class MyMemberStore {
  readonly #myMember = inject(MyMember);
  readonly #socketService = inject(Socket);
  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentBarId()), {
    parse: (member) => memberMapper(member),
  });

  constructor() {
    effect(() => {
      const roleChanged = this.#socketService.memberRoleChanged();
      const mine = this.myMember.hasValue() ? this.myMember.value() : undefined;

      if (roleChanged && mine && roleChanged.userId === mine.userId) {
        this.reloadMyMember();
      }
    });
  }

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
