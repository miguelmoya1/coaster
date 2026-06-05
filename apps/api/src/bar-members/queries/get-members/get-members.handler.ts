import type { BarMember } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { BarMembersMapper } from '../../mappers/bar-members.mapper';
import { GetMembersQuery } from './get-members.query';

@QueryHandler(GetMembersQuery)
export class GetMembersHandler implements IQueryHandler<GetMembersQuery, BarMember[]> {
  constructor(private readonly repository: BarMembersRepository) {}

  async execute(query: GetMembersQuery): Promise<BarMember[]> {
    const members = await this.repository.getMembersByBar(query.barId);
    return members.map((member) => BarMembersMapper.toDomain(member));
  }
}
