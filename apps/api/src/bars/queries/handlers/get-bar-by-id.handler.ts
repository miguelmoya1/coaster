import type { Bar } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BarReadRepository } from '../../data-access/bar.read.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { GetBarByIdQuery } from '../impl/get-bar-by-id.query';

@QueryHandler(GetBarByIdQuery)
export class GetBarByIdHandler implements IQueryHandler<GetBarByIdQuery, Bar | null> {
  constructor(private readonly readRepo: BarReadRepository) {}

  async execute(query: GetBarByIdQuery): Promise<Bar | null> {
    const bar = await this.readRepo.findById(query.barId);

    if (!bar) {
      return null;
    }

    return BarsMapper.toDomain(bar);
  }
}
