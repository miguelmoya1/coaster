import type { TimeEntry, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { replayClockState, toDatedMarks } from '../../domain/workday';
import { TimeEntryAmendedEvent } from '../../events/impl/time-entry-amended.event';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { ResolveTimeCorrectionCommand } from '../impl/resolve-time-correction.command';

@CommandHandler(ResolveTimeCorrectionCommand)
export class ResolveTimeCorrectionHandler implements ICommandHandler<ResolveTimeCorrectionCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: ResolveTimeCorrectionCommand): Promise<TimeEntry> {
    const { barId, entryId, actor, approved, dto } = command;

    const current = await this._readRepo.findCurrentById(barId, entryId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND);
    }

    if (current.supersededBy || current.action === TimeEntryAction.VOIDED) {
      throw new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT);
    }

    const userId = asUserId(current.userId);
    const rows = await this._readRepo.findByWorkdayRange(barId, current.workdayDate, current.workdayDate, userId);
    const entry = TimeEntriesMapper.groupByRoot(rows).find((candidate) => candidate.rootId === current.rootId);
    const request = entry?.pendingRequest;

    if (!request) {
      throw new BadRequestException(ErrorCodes.NO_PENDING_TIME_CORRECTION);
    }

    /* An approval carries the reason the employee gave; a refusal without words says just that. */
    const reason = dto.reason?.trim() || (approved ? request.reason : null);
    const shared = {
      barId,
      userId,
      userSnapshot: current.userSnapshot as { name: string; email: string },
      type: current.type as TimeEntryType,
      workdayDate: current.workdayDate,
      source: current.source as TimeEntrySource,
      actorId: actor.id,
      rootId: current.rootId,
      reason,
    };

    if (!approved) {
      await this._writeRepo.append({
        ...shared,
        action: TimeEntryAction.REJECTED,
        occurredAt: new Date(request.occurredAt),
      });

      return TimeEntriesMapper.toDomain(await this._readRepo.findByRoots([current.rootId]));
    }

    const occurredAt = new Date(request.occurredAt);
    const day = TimeEntriesMapper.groupByRoot(rows).map((candidate) =>
      candidate.rootId === current.rootId ? { ...candidate, occurredAt: request.occurredAt } : candidate,
    );

    if (!replayClockState(toDatedMarks(day))) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    await this._writeRepo.append({
      ...shared,
      action: TimeEntryAction.AMENDED,
      occurredAt,
      supersedesId: current.id,
    });

    const amended = TimeEntriesMapper.toDomain(await this._readRepo.findByRoots([current.rootId]));
    this._eventBus.publish(
      new TimeEntryAmendedEvent(barId, amended, current.occurredAt.toISOString(), actor.id, actor.role, reason ?? ''),
    );

    return amended;
  }
}
