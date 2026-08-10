import type { EstablishmentMember } from '@coaster/common';
import { asEstablishmentMemberId, EstablishmentRole, ErrorCodes, Role } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { EstablishmentMembersMapper } from '../../mappers/establishment-members.mapper';
import { GetMemberMeQuery } from '../impl/get-member-me.query';

@QueryHandler(GetMemberMeQuery)
export class GetMemberMeHandler implements IQueryHandler<GetMemberMeQuery, EstablishmentMember> {
  constructor(private readonly repository: EstablishmentMembersReadRepository) {}

  async execute(query: GetMemberMeQuery): Promise<EstablishmentMember> {
    const member = await this.repository.getMemberByUserAndEstablishment(query.user.id, query.establishmentId);

    if (!member || !member.active) {
      if (query.user.role === Role.ADMIN) {
        return {
          id: asEstablishmentMemberId('mock-admin-member'),
          userId: query.user.id,
          establishmentId: query.establishmentId,
          role: EstablishmentRole.OWNER,
          active: true,
          permissions: [],
          userName: query.user.name,
          userEmail: query.user.email,
          userImage: query.user.photoUrl || '',
        };
      }
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    return EstablishmentMembersMapper.toDomain(member);
  }
}
