import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  EstablishmentId,
  EstablishmentMemberId,
  EstablishmentRole,
  DeleteResponse,
  InviteEstablishmentMemberDto,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '@coaster/core';

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
