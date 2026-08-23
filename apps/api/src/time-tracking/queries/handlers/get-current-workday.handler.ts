import type { Workday } from '@coaster/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { formatWorkdayDate, isDayOpen, toDatedMarks, toWorkdayDate } from '../../domain/workday';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { GetCurrentWorkdayQuery } from '../impl/get-current-workday.query';
import { GetWorkdaysQuery } from '../impl/get-workdays.query';

@QueryHandler(GetCurrentWorkdayQuery)
export class GetCurrentWorkdayHandler implements IQueryHandler<GetCurrentWorkdayQuery, Workday | null> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _queryBus: QueryBus,
  ) {}

  async execute({ establishmentId, userId }: GetCurrentWorkdayQuery): Promise<Workday | null> {
    const rows = await this._readRepo.findLatestWorkday(establishmentId, userId);
    const latest = TimeEntriesMapper.groupByRoot(rows);
    const date = isDayOpen(toDatedMarks(latest))
      ? latest[0].workdayDate
      : formatWorkdayDate(toWorkdayDate(new Date()));

    const [workday] = await this._queryBus.execute<GetWorkdaysQuery, Workday[]>(
      new GetWorkdaysQuery(establishmentId, date, date, userId),
    );

    return workday ?? null;
  }
}
