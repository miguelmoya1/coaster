import type { Establishment } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EstablishmentReadRepository } from '../../data-access/establishment.read.repository';
import { EstablishmentsMapper } from '../../mappers/establishments.mapper';
import { GetEstablishmentByIdQuery } from '../impl/get-establishment-by-id.query';

@QueryHandler(GetEstablishmentByIdQuery)
export class GetEstablishmentByIdHandler implements IQueryHandler<GetEstablishmentByIdQuery, Establishment | null> {
  constructor(private readonly readRepo: EstablishmentReadRepository) {}

  async execute(query: GetEstablishmentByIdQuery): Promise<Establishment | null> {
    const establishment = await this.readRepo.findById(query.establishmentId);

    if (!establishment) {
      return null;
    }

    return EstablishmentsMapper.toDomain(establishment);
  }
}
