import type { TimeEntry, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { isValidSequence, toDatedMarks } from '../../domain/workday';
import { TimeEntryVoidedEvent } from '../../events/impl/time-entry-voided.event';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { VoidTimeEntryCommand } from '../impl/void-time-entry.command';

@CommandHandler(VoidTimeEntryCommand)
export class VoidTimeEntryHandler implements ICommandHandler<VoidTimeEntryCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: VoidTimeEntryCommand): Promise<TimeEntry> {
    const { establishmentId, entryId, actor, dto } = command;

    const current = await this._readRepo.findCurrentById(establishmentId, entryId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND);
    }

    if (current.supersededBy || current.action === TimeEntryAction.VOIDED) {
      throw new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT);
    }

    const userId = asUserId(current.userId);
    const rows = await this._readRepo.findByWorkdayRange(
      establishmentId,
      current.workdayDate,
      current.workdayDate,
      userId,
    );
    const day = TimeEntriesMapper.groupByRoot(rows).filter((entry) => entry.rootId !== current.rootId);

    if (!isValidSequence(toDatedMarks(day))) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    const reason = dto.reason.trim();

    await this._writeRepo.append({
      establishmentId,
      userId,
      userSnapshot: current.userSnapshot as { name: string; email: string },
      type: current.type as TimeEntryType,
      action: TimeEntryAction.VOIDED,
      occurredAt: current.occurredAt,
      workdayDate: current.workdayDate,
      source: current.source as TimeEntrySource,
      actorId: actor.id,
      rootId: current.rootId,
      supersedesId: current.id,
      reason,
    });

    const entry = TimeEntriesMapper.toDomain(await this._readRepo.findByRoots([current.rootId]));
    this._eventBus.publish(new TimeEntryVoidedEvent(establishmentId, entry, actor.id, actor.role, reason));

    return entry;
  }
}
