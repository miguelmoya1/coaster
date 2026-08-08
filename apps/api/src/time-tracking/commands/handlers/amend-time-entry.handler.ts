import type { TimeEntry, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { replayClockState, toDatedMarks } from '../../domain/workday';
import { TimeEntryAmendedEvent } from '../../events/impl/time-entry-amended.event';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { AmendTimeEntryCommand } from '../impl/amend-time-entry.command';

@CommandHandler(AmendTimeEntryCommand)
export class AmendTimeEntryHandler implements ICommandHandler<AmendTimeEntryCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AmendTimeEntryCommand): Promise<TimeEntry> {
    const { barId, entryId, actor, dto } = command;

    const current = await this._readRepo.findCurrentById(barId, entryId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND);
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

    const reason = dto.reason.trim();

    await this._writeRepo.append({
      barId,
      userId,
      userSnapshot: current.userSnapshot as { name: string; email: string },
      type: current.type as TimeEntryType,
      action: TimeEntryAction.AMENDED,
      occurredAt,
      workdayDate: current.workdayDate,
      source: current.source as TimeEntrySource,
      actorId: actor.id,
      rootId: current.rootId,
      supersedesId: current.id,
      reason,
    });

    const entry = TimeEntriesMapper.toDomain(await this._readRepo.findByRoots([current.rootId]));
    this._eventBus.publish(
      new TimeEntryAmendedEvent(barId, entry, current.occurredAt.toISOString(), actor.id, actor.role, reason),
    );

    return entry;
  }
}
