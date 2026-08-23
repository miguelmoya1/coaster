import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentPermission, EstablishmentRole, hasPermission } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { memberMapper } from '../mappers/member.mapper';
import { MyMember } from '../services/my-member';

@Service()
export class MyMemberStore {
  readonly #myMember = inject(MyMember);
  readonly #realtime = inject(Realtime);
  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentEstablishmentId()), {
    parse: (member) => memberMapper(member),
  });

  constructor() {
    effect(() => {
      const roleChanged = this.#realtime.memberRoleChanged();
      const mine = this.myMember.hasValue() ? this.myMember.value() : undefined;

      if (roleChanged && mine && roleChanged.userId === mine.userId) {
        this.reloadMyMember();
      }
    });
  }

  public readonly myMember = this.#myMemberResource.asReadonly();
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  public readonly isOwner = computed(() => {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member?.role === EstablishmentRole.OWNER;
  });

  public hasPermission(permission: EstablishmentPermission): boolean {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member ? hasPermission(member.role, permission) : false;
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reloadMyMember() {
    this.#myMemberResource.reload();
  }
}
