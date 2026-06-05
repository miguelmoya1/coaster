import type { ShiftExchange } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { ShiftExchangesMapper } from '../../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from './get-pending-exchanges.query';

@QueryHandler(GetPendingExchangesQuery)
export class GetPendingExchangesHandler implements IQueryHandler<GetPendingExchangesQuery, ShiftExchange[]> {
  constructor(private readonly _shiftExchangesRepository: ShiftExchangesRepository) {}

  async execute(query: GetPendingExchangesQuery): Promise<ShiftExchange[]> {
    const exchanges = await this._shiftExchangesRepository.findPendingByBarId(query.barId);
    return exchanges.map((e) => ShiftExchangesMapper.toDomain(e));
  }
}
