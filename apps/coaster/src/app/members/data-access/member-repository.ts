import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarMember, BarId, InviteBarMemberDto } from '@coaster/interfaces';
import { firstValueFrom, map } from 'rxjs';
import { memberMapper } from '../mappers/member.mapper';

@Injectable({ providedIn: 'root' })
export class MemberRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/members`,
    invite: (barId: BarId) => `/bars/${barId}/members`,
  };

  public async invite(barId: BarId, dto: InviteBarMemberDto) {
    return firstValueFrom(this.#http.post<BarMember>(this.routes.invite(barId), dto).pipe(map(memberMapper)));
  }
}
