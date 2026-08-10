import type { EstablishmentMember } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { EstablishmentMembersMapper } from '../../mappers/establishment-members.mapper';
import { GetMembersQuery } from '../impl/get-members.query';

@QueryHandler(GetMembersQuery)
export class GetMembersHandler implements IQueryHandler<GetMembersQuery, EstablishmentMember[]> {
  constructor(private readonly repository: EstablishmentMembersReadRepository) {}

  async execute(query: GetMembersQuery): Promise<EstablishmentMember[]> {
    const members = await this.repository.getMembersByEstablishment(query.establishmentId);
    return members.map((member) => EstablishmentMembersMapper.toDomain(member));
  }
}
