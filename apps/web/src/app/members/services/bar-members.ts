import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarsStore } from '../../bars';
import { MemberRepository } from '../data-access/member-repository';
import { memberArrayMapper } from '../mappers/member.mapper';

@Injectable({ providedIn: 'root' })
export class BarMembers {
  readonly #memberRepo = inject(MemberRepository);
  readonly #barsstore = inject(BarsStore);

  readonly #list = httpResource(
    () => {
      const barId = this.#barsstore.currentBarId();
      if (!barId) return undefined;

      return this.#memberRepo.routes.list(barId);
    },
    { parse: (members) => memberArrayMapper(members) },
  );

  public readonly list = this.#list.asReadonly();

  public reload() {
    this.#list.reload();
  }
}
