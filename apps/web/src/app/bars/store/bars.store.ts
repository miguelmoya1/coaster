import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { BarId, BarPermission, CreateBarDto } from '@coaster/common';
import { BarRole } from '@coaster/common';
import { handleErrorFormField, hasPermission } from '@coaster/core';
import { memberMapper } from '@coaster/members';
import { barArrayMapper, barMapper } from '../mappers/bar.mapper';
import { CreateBar } from '../services/create-bar';
import { CurrentBar } from '../services/current-bar';
import { MyBars } from '../services/my-bars';
import { MyMember } from '../services/my-member';

@Service()
export class BarsStore {
  readonly #createBar = inject(CreateBar);
  readonly #myBars = inject(MyBars);
  readonly #currentBar = inject(CurrentBar);
  readonly #myMember = inject(MyMember);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #myBarsResource = httpResource(() => this.#myBars.execute(), {
    parse: (bars) => barArrayMapper(bars),
  });

  readonly #currentBarResource = httpResource(() => this.#currentBar.execute(this.#currentBarId()), {
    parse: (bar) => barMapper(bar),
  });

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentBarId()), {
    parse: (member) => memberMapper(member),
  });

  public readonly list = this.#myBarsResource.asReadonly();
  public readonly current = this.#currentBarResource.asReadonly();
  public readonly currentId = this.#currentBarId.asReadonly();
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

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadCurrentBar() {
    this.#currentBarResource.reload();
    this.#myMemberResource.reload();
  }

  public reloadMyBars() {
    this.#myBarsResource.reload();
  }

  public async create(createBarDto: CreateBarDto) {
    try {
      await this.#createBar.execute(createBarDto);
      this.reloadMyBars();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
