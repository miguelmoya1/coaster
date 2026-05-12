import { inject, Injectable } from '@angular/core';
import { BarId, BarMemberId } from '@coaster/common';
import { MemberRepository } from '../data-access/member-repository';

@Injectable({
  providedIn: 'root',
})
export class RemoveMember {
  readonly #memberRepository = inject(MemberRepository);

  public async execute(barId: BarId, memberId: BarMemberId) {
    return await this.#memberRepository.remove(barId, memberId);
  }
}
