import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';

@Injectable({
  providedIn: 'root',
})
export class RemoveMember {
  readonly #memberRepository = inject(MemberRepository);

  public async remove(barId: BarId, memberId: string) {
    return await this.#memberRepository.remove(barId, memberId);
  }
}
