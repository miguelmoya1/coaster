import { GetMembersQuery } from '@coaster/establishment-members';
import type { EstablishmentMember, TimeEntry } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, TimeEntrySource } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from '../../data-access/time-entries.write.repository';
import { planMark, shiftWorkdayDate, toDatedMarks, toWorkdayDate } from '../../domain/workday';
import { TimeEntryRecordedEvent } from '../../events/impl/time-entry-recorded.event';
import { TimeEntriesMapper } from '../../mappers/time-entries.mapper';
import { CreateTimeEntryCommand } from '../impl/create-time-entry.command';

@CommandHandler(CreateTimeEntryCommand)
export class CreateTimeEntryHandler implements ICommandHandler<CreateTimeEntryCommand, TimeEntry> {
  constructor(
    private readonly _readRepo: TimeEntriesReadRepository,
    private readonly _writeRepo: TimeEntriesWriteRepository,
    private readonly _queryBus: QueryBus,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateTimeEntryCommand): Promise<TimeEntry> {
    const { establishmentId, actor, dto } = command;

    const occurredAt = new Date(dto.occurredAt);

    if (isNaN(occurredAt.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const members = await this._queryBus.execute<GetMembersQuery, EstablishmentMember[]>(
      new GetMembersQuery(establishmentId),
    );
    const member = members.find((candidate) => candidate.userId === dto.userId && candidate.active);

    if (!member) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    const natural = toWorkdayDate(occurredAt);
    const rows = await this._readRepo.findByWorkdayRange(
      establishmentId,
      shiftWorkdayDate(natural, -1),
      natural,
      dto.userId,
    );
    const workdayDate = planMark(dto.type, occurredAt, toDatedMarks(TimeEntriesMapper.groupByRoot(rows)));

    if (!workdayDate) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    const created = await this._writeRepo.append({
      establishmentId,
      userId: dto.userId,
      userSnapshot: { name: member.userName, email: member.userEmail },
      type: dto.type,
      action: TimeEntryAction.RECORDED,
      occurredAt,
      workdayDate,
      source: TimeEntrySource.MANUAL,
      actorId: actor.id,
      reason: dto.reason.trim(),
    });

    const entry = TimeEntriesMapper.toDomain([created]);
    this._eventBus.publish(new TimeEntryRecordedEvent(establishmentId, entry, actor.id, actor.role, dto.reason.trim()));

    return entry;
  }
}
