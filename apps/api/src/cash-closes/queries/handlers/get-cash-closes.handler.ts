import type { CashClose } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CashClosesReadRepository } from '../../data-access/cash-closes.read.repository';
import { CashClosesMapper } from '../../mappers/cash-closes.mapper';
import { GetCashClosesQuery } from '../impl/get-cash-closes.query';

@QueryHandler(GetCashClosesQuery)
export class GetCashClosesHandler implements IQueryHandler<GetCashClosesQuery, CashClose[]> {
  constructor(private readonly readRepo: CashClosesReadRepository) {}

  async execute(query: GetCashClosesQuery): Promise<CashClose[]> {
    const cashCloses = await this.readRepo.findRecent(query.establishmentId);
    return cashCloses.map((cashClose) => CashClosesMapper.toDomain(cashClose));
  }
}
