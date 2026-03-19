import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';
import { memberArrayMapper } from '../mappers/member.mapper';

@Injectable({ providedIn: 'root' })
export class BarMembers {
  readonly #memberRepo = inject(MemberRepository);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #list = httpResource(
    () => {
      const barId = this.#currentBarId();
      if (!barId) return undefined;

      return this.#memberRepo.routes.list(barId);
    },
    { parse: memberArrayMapper },
  );

  public readonly list = this.#list.asReadonly();

  public selectBar(barId: BarId) {
    this.#currentBarId.set(barId);
  }

  public clearBar() {
    this.#currentBarId.set(undefined);
  }

  public reload() {
    this.#list.reload();
  }
}
