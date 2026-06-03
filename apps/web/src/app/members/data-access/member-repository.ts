import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { BarId, BarMember, BarMemberId, DeleteResponse, InviteBarMemberDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '../../core/mappers/common.mapper';
import { memberMapper } from '../mappers/member.mapper';

@Injectable({ providedIn: 'root' })
export class MemberRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/members`,
    invite: (barId: BarId) => `/bars/${barId}/members`,
    me: (barId: BarId) => `/bars/${barId}/members/me`,
    remove: (barId: BarId, memberId: string) => `/bars/${barId}/members/${memberId}`,
  };

  public async me(barId: BarId) {
    return firstValueFrom(
      this.#http.get<BarMember>(this.routes.me(barId)).pipe(map((member) => memberMapper(member))),
    );
  }

  public async invite(barId: BarId, dto: InviteBarMemberDto) {
    return firstValueFrom(
      this.#http.post<BarMember>(this.routes.invite(barId), dto).pipe(map((member) => memberMapper(member))),
    );
  }

  public async remove(barId: BarId, memberId: BarMemberId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.remove(barId, memberId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}
