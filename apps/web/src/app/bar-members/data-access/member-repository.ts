import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { BarId, BarMember, BarMemberId, BarRole, DeleteResponse, InviteBarMemberDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '@coaster/core';
import { memberMapper } from '../mappers/member.mapper';

@Service()
export class MemberRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/members`,
    invite: (barId: BarId) => `/bars/${barId}/members`,
    me: (barId: BarId) => `/bars/${barId}/members/me`,
    member: (barId: BarId, memberId: string) => `/bars/${barId}/members/${memberId}`,
  };

  public async me(barId: BarId) {
    return firstValueFrom(this.#http.get<BarMember>(this.routes.me(barId)).pipe(map((member) => memberMapper(member))));
  }

  public async invite(barId: BarId, dto: InviteBarMemberDto) {
    return firstValueFrom(this.#http.post<void>(this.routes.invite(barId), dto));
  }

  public async updateRole(barId: BarId, memberId: BarMemberId, role: BarRole) {
    return firstValueFrom(this.#http.patch<void>(this.routes.member(barId, memberId), { role }));
  }

  public async remove(barId: BarId, memberId: BarMemberId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.member(barId, memberId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}
