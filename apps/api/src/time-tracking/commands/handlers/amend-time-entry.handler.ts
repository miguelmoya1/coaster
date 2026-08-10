import { GetMembersQuery } from '@coaster/establishment-members';
import type {
  EstablishmentId,
  EstablishmentMember,
  TimeEntry,
  TimeEntrySource,
  TimeEntryType,
  UserId,
} from '@coaster/common';
import { EstablishmentPermission, ErrorCodes, Role, TimeEntryAction, asUserId } from '@coaster/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
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
    private readonly _queryBus: QueryBus,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AmendTimeEntryCommand): Promise<TimeEntry> {
    const { establishmentId, entryId, actor, dto } = command;

    const current = await this._readRepo.findCurrentById(establishmentId, entryId);

    if (!current) {
      throw new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND);
    }

    if (current.supersededBy || current.action === TimeEntryAction.VOIDED) {
      throw new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT);
    }

    /*
     * Everyone fixes their own hours; touching somebody else's is what needs the establishment to trust you.
     * The guard cannot tell whose mark it is, so the ownership half of the rule lives here.
     */
    if (current.userId !== actor.id && !(await this.#canManageOthers(establishmentId, actor.id, actor.role))) {
      throw new ForbiddenException(ErrorCodes.NOT_YOUR_TIME_ENTRY);
    }

    const occurredAt = new Date(dto.occurredAt);

    if (isNaN(occurredAt.getTime())) {
      throw new BadRequestException(ErrorCodes.INVALID_DATE);
    }

    const userId = asUserId(current.userId);
    const rows = await this._readRepo.findByWorkdayRange(
      establishmentId,
      current.workdayDate,
      current.workdayDate,
      userId,
    );
    const day = TimeEntriesMapper.groupByRoot(rows).map((entry) =>
      entry.rootId === current.rootId ? { ...entry, occurredAt: occurredAt.toISOString() } : entry,
    );

    if (!replayClockState(toDatedMarks(day))) {
      throw new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE);
    }

    const reason = dto.reason.trim();

    await this._writeRepo.append({
      establishmentId,
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
      new TimeEntryAmendedEvent(establishmentId, entry, current.occurredAt.toISOString(), actor.id, actor.role, reason),
    );

    return entry;
  }

  async #canManageOthers(establishmentId: EstablishmentId, userId: UserId, platformRole: Role): Promise<boolean> {
    if (platformRole === Role.ADMIN) {
      return true;
    }

    const members = await this._queryBus.execute<GetMembersQuery, EstablishmentMember[]>(
      new GetMembersQuery(establishmentId),
    );
    const member = members.find((candidate) => candidate.userId === userId);

    return member?.permissions.includes(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES) ?? false;
  }
}
