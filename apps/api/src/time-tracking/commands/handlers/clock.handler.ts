import type { TimeEntry } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, TimeEntrySource } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { planMark, toDatedMarks } from '../../domain/workday';
import { TimeEntryRecordedEvent } from '../../events/impl/time-entry-recorded.event';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { ClockCommand } from '../impl/clock.command';

@CommandHandler(ClockCommand)
export class ClockHandler implements ICommandHandler<ClockCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: ClockCommand): Promise<TimeEntry> {
    const { establishmentId, actor, dto } = command;

    const occurredAt = new Date();
    const rows = await this._readRepo.findLatestWorkday(establishmentId, actor.id);
    const workdayDate = planMark(dto.type, occurredAt, toDatedMarks(TimeEntriesMapper.groupByRoot(rows)));

    if (!workdayDate) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    const created = await this._writeRepo.append({
      establishmentId,
      userId: actor.id,
      userSnapshot: { name: actor.name, email: actor.email },
      type: dto.type,
      action: TimeEntryAction.RECORDED,
      occurredAt,
      workdayDate,
      source: TimeEntrySource.EMPLOYEE_DEVICE,
      actorId: actor.id,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    const entry = TimeEntriesMapper.toDomain([created]);
    this._eventBus.publish(new TimeEntryRecordedEvent(establishmentId, entry, actor.id, actor.role, null));

    return entry;
  }
}
