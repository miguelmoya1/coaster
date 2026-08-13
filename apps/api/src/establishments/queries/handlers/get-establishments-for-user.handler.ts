import type { Establishment } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentReadRepository } from '../../data-access/establishment.read.repository';
import { EstablishmentsMapper } from '../../mappers/establishments.mapper';
import { GetEstablishmentsForUserQuery } from '../impl/get-establishments-for-user.query';

@QueryHandler(GetEstablishmentsForUserQuery)
export class GetEstablishmentsForUserHandler implements IQueryHandler<GetEstablishmentsForUserQuery, Establishment[]> {
  constructor(private readonly readRepo: EstablishmentReadRepository) {}

  async execute(query: GetEstablishmentsForUserQuery): Promise<Establishment[]> {
    const memberships = await this.readRepo.findByUserId(query.user.id);
    return memberships.map((m) => EstablishmentsMapper.toDomain(m));
  }
}
