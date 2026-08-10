import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  EstablishmentId,
  EstablishmentMember,
  EstablishmentMemberId,
  EstablishmentRole,
  DeleteResponse,
  InviteEstablishmentMemberDto,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '@coaster/core';
import { memberMapper } from '../mappers/member.mapper';

@Service()
export class MemberRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/members`,
    invite: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/members`,
    me: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/members/me`,
    member: (establishmentId: EstablishmentId, memberId: string) =>
      `/establishments/${establishmentId}/members/${memberId}`,
  };

  public async me(establishmentId: EstablishmentId) {
    return firstValueFrom(
      this.#http.get<EstablishmentMember>(this.routes.me(establishmentId)).pipe(map((member) => memberMapper(member))),
    );
  }

  public async invite(establishmentId: EstablishmentId, dto: InviteEstablishmentMemberDto) {
    return firstValueFrom(this.#http.post<void>(this.routes.invite(establishmentId), dto));
  }

  public async updateRole(establishmentId: EstablishmentId, memberId: EstablishmentMemberId, role: EstablishmentRole) {
    return firstValueFrom(this.#http.patch<void>(this.routes.member(establishmentId, memberId), { role }));
  }

  public async remove(establishmentId: EstablishmentId, memberId: EstablishmentMemberId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.member(establishmentId, memberId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}
