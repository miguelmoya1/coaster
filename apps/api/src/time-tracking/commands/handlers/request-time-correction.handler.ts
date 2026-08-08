import type { TimeEntry, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, asUserId } from '@coaster/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { replayClockState, toDatedMarks } from '../../domain/workday';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { RequestTimeCorrectionCommand } from '../impl/request-time-correction.command';

@CommandHandler(RequestTimeCorrectionCommand)
export class RequestTimeCorrectionHandler implements ICommandHandler<RequestTimeCorrectionCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
  ) {}

  async execute(command: RequestTimeCorrectionCommand): Promise<TimeEntry> {
    const { barId, entryId, actor, dto } = command;

    const current = await this._readRepo.findCurrentById(barId, entryId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND);
    }

    if (current.userId !== actor.id) {
      throw new ForbiddenException(ErrorCodes.NOT_YOUR_TIME_ENTRY);
    }

    if (current.supersededBy || current.action === TimeEntryAction.VOIDED) {
      throw new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT);
    }

    const occurredAt = new Date(dto.occurredAt);

    if (isNaN(occurredAt.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const userId = asUserId(current.userId);
    const rows = await this._readRepo.findByWorkdayRange(barId, current.workdayDate, current.workdayDate, userId);
    const day = TimeEntriesMapper.groupByRoot(rows).map((entry) =>
      entry.rootId === current.rootId ? { ...entry, occurredAt: occurredAt.toISOString() } : entry,
    );

    if (!replayClockState(toDatedMarks(day))) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    /*
     * The request is appended like everything else, but it does not supersede the mark: the hour on
     * the record only changes when whoever manages the bar approves it.
     */
    await this._writeRepo.append({
      barId,
      userId,
      userSnapshot: current.userSnapshot as { name: string; email: string },
      type: current.type as TimeEntryType,
      action: TimeEntryAction.REQUESTED,
      occurredAt,
      workdayDate: current.workdayDate,
      source: current.source as TimeEntrySource,
      actorId: actor.id,
      rootId: current.rootId,
      reason: dto.reason.trim(),
    });

    return TimeEntriesMapper.toDomain(await this._readRepo.findByRoots([current.rootId]));
  }
}
