import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type {
  EstablishmentId,
  TimeEntry,
  TimeEntryId,
  TimeSheetIntegrity,
  User,
  UserId,
  Workday,
} from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, SkipSubscriptionCheck } from '@coaster/core';
import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AmendTimeEntryCommand } from '../commands/impl/amend-time-entry.command';
import { ClockCommand } from '../commands/impl/clock.command';
import { CreateTimeEntryCommand } from '../commands/impl/create-time-entry.command';
import { VoidTimeEntryCommand } from '../commands/impl/void-time-entry.command';
import { formatWorkdayDate, toWorkdayDate } from '../domain/workday';
import { AmendTimeEntryDto } from '../dto/amend-time-entry.dto';
import { ClockDto } from '../dto/clock.dto';
import { CreateTimeEntryDto } from '../dto/create-time-entry.dto';
import { TimeSheetQueryDto } from '../dto/time-sheet-query.dto';
import { VoidTimeEntryDto } from '../dto/void-time-entry.dto';
import { GetCurrentWorkdayQuery } from '../queries/impl/get-current-workday.query';
import { GetTimeSheetIntegrityQuery } from '../queries/impl/get-time-sheet-integrity.query';
import { GetWorkdaysQuery } from '../queries/impl/get-workdays.query';
import { toTimeSheetCsv } from '../utils/time-sheet-csv';

@Controller('establishments/:establishmentId/time-entries')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class TimeEntriesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post('clock')
  @SkipSubscriptionCheck()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOCK_IN)
  clock(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: ClockDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<ClockCommand, TimeEntry>(new ClockCommand(establishmentId, user, dto));
  }

  @Get('me/current')
  @SkipSubscriptionCheck()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOCK_IN)
  myCurrentWorkday(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @CurrentUser() user: User,
  ): Promise<Workday | null> {
    return this._queryBus.execute<GetCurrentWorkdayQuery, Workday | null>(
      new GetCurrentWorkdayQuery(establishmentId, user.id),
    );
  }

  @Get('me')
  myWorkdays(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
    @CurrentUser() user: User,
  ): Promise<Workday[]> {
    return this.#workdays(establishmentId, query, user.id);
  }

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES)
  workdays(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
  ): Promise<Workday[]> {
    return this.#workdays(establishmentId, query, query.userId);
  }

  @Get('export')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="registro-horario.csv"')
  async export(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
  ): Promise<string> {
    return toTimeSheetCsv(await this.#workdays(establishmentId, query, query.userId));
  }

  @Get('integrity')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  integrity(@Param('establishmentId') establishmentId: EstablishmentId): Promise<TimeSheetIntegrity> {
    return this._queryBus.execute<GetTimeSheetIntegrityQuery, TimeSheetIntegrity>(
      new GetTimeSheetIntegrityQuery(establishmentId),
    );
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  create(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<CreateTimeEntryCommand, TimeEntry>(
      new CreateTimeEntryCommand(establishmentId, user, dto),
    );
  }

  @Post(':entryId/amend')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_AMEND_OWN_TIME_ENTRY)
  amend(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: AmendTimeEntryDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<AmendTimeEntryCommand, TimeEntry>(
      new AmendTimeEntryCommand(establishmentId, entryId, user, dto),
    );
  }

  @Post(':entryId/void')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  voidEntry(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: VoidTimeEntryDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<VoidTimeEntryCommand, TimeEntry>(
      new VoidTimeEntryCommand(establishmentId, entryId, user, dto),
    );
  }

  #workdays(establishmentId: EstablishmentId, query: TimeSheetQueryDto, userId?: UserId): Promise<Workday[]> {
    const today = formatWorkdayDate(toWorkdayDate(new Date()));

    return this._queryBus.execute<GetWorkdaysQuery, Workday[]>(
      new GetWorkdaysQuery(establishmentId, query.from ?? today, query.to ?? query.from ?? today, userId),
    );
  }
}
