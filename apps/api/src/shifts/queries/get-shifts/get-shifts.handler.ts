import { Shift, ErrorCodes } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ShiftsRepository } from '../../data-access/shifts.repository';
import { ShiftsMapper } from '../../mappers/shifts.mapper';
import { GetShiftsQuery } from './get-shifts.query';

@QueryHandler(GetShiftsQuery)
export class GetShiftsHandler implements IQueryHandler<GetShiftsQuery, Shift[]> {
  constructor(private readonly _shiftsRepository: ShiftsRepository) {}

  async execute(query: GetShiftsQuery): Promise<Shift[]> {
    const start = query.startDateIso ? new Date(query.startDateIso) : undefined;
    const end = query.endDateIso ? new Date(query.endDateIso) : undefined;

    if (start && isNaN(start.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    if (end && isNaN(end.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const shifts = await this._shiftsRepository.findByBarId(query.barId, start, end);
    return shifts.map((shift) => ShiftsMapper.toDomain(shift));
  }
}
