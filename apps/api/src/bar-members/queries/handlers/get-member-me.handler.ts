import type { BarMember } from '@coaster/common';
import { BarRole, Role } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { asBarMemberId, ErrorCodes } from '../../../core';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { BarMembersMapper } from '../../mappers/bar-members.mapper';
import { GetMemberMeQuery } from '../impl/get-member-me.query';

@QueryHandler(GetMemberMeQuery)
export class GetMemberMeHandler implements IQueryHandler<GetMemberMeQuery, BarMember> {
  constructor(private readonly repository: BarMembersReadRepository) {}

  async execute(query: GetMemberMeQuery): Promise<BarMember> {
    const member = await this.repository.getMemberByUserAndBar(query.user.id, query.barId);

    if (!member || !member.active) {
      if (query.user.role === Role.ADMIN) {
        return {
          id: asBarMemberId('mock-admin-member'),
          userId: query.user.id,
          barId: query.barId,
          role: BarRole.OWNER,
          active: true,
          permissions: [],
          userName: query.user.name,
          userEmail: query.user.email,
          userImage: query.user.photoUrl || '',
        };
      }
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    return BarMembersMapper.toDomain(member);
  }
}
