import type { BarMember } from '@coaster/common';
import { ErrorCodes } from '../../../core';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { BarMembersMapper } from '../../mappers/bar-members.mapper';
import { GetMemberMeQuery } from './get-member-me.query';

@QueryHandler(GetMemberMeQuery)
export class GetMemberMeHandler implements IQueryHandler<GetMemberMeQuery, BarMember> {
  constructor(private readonly repository: BarMembersRepository) {}

  async execute(query: GetMemberMeQuery): Promise<BarMember> {
    const member = await this.repository.getMemberByUserAndBar(query.userId, query.barId);
    if (!member || !member.active) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }
    return BarMembersMapper.toDomain(member);
  }
}
