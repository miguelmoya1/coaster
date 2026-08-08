import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { BarId, TimeEntry, TimeEntryId, TimeSheetIntegrity, User, UserId, Workday } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { BarPermissions, BarPermissionsGuard, SkipSubscriptionCheck } from '@coaster/core';
import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AmendTimeEntryCommand } from '../commands/impl/amend-time-entry.command';
import { ClockCommand } from '../commands/impl/clock.command';
import { CreateTimeEntryCommand } from '../commands/impl/create-time-entry.command';
import { RequestTimeCorrectionCommand } from '../commands/impl/request-time-correction.command';
import { ResolveTimeCorrectionCommand } from '../commands/impl/resolve-time-correction.command';
import { VoidTimeEntryCommand } from '../commands/impl/void-time-entry.command';
import { formatWorkdayDate, toWorkdayDate } from '../domain/workday';
import { AmendTimeEntryDto } from '../dto/amend-time-entry.dto';
import { ClockDto } from '../dto/clock.dto';
import { CreateTimeEntryDto } from '../dto/create-time-entry.dto';
import { RequestTimeCorrectionDto } from '../dto/request-time-correction.dto';
import { ResolveTimeCorrectionDto } from '../dto/resolve-time-correction.dto';
import { TimeSheetQueryDto } from '../dto/time-sheet-query.dto';
import { VoidTimeEntryDto } from '../dto/void-time-entry.dto';
import { GetTimeSheetIntegrityQuery } from '../queries/impl/get-time-sheet-integrity.query';
import { GetWorkdaysQuery } from '../queries/impl/get-workdays.query';
import { toTimeSheetCsv } from '../utils/time-sheet-csv';

@Controller('bars/:barId/time-entries')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class TimeEntriesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post('clock')
  @SkipSubscriptionCheck()
  @BarPermissions(BarPermission.BAR_CLOCK_IN)
  clock(@Param('barId') barId: BarId, @Body() dto: ClockDto, @CurrentUser() user: User): Promise<TimeEntry> {
    return this._commandBus.execute<ClockCommand, TimeEntry>(new ClockCommand(barId, user, dto));
  }

  @Get('me')
  myWorkdays(
    @Param('barId') barId: BarId,
    @Query() query: TimeSheetQueryDto,
    @CurrentUser() user: User,
  ): Promise<Workday[]> {
    return this.#workdays(barId, query, user.id);
  }

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_TIME_ENTRIES)
  workdays(@Param('barId') barId: BarId, @Query() query: TimeSheetQueryDto): Promise<Workday[]> {
    return this.#workdays(barId, query, query.userId);
  }

  @Get('export')
  @BarPermissions(BarPermission.BAR_VIEW_TIME_ENTRIES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="registro-horario.csv"')
  async export(@Param('barId') barId: BarId, @Query() query: TimeSheetQueryDto): Promise<string> {
    return toTimeSheetCsv(await this.#workdays(barId, query, query.userId));
  }

  @Get('integrity')
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  integrity(@Param('barId') barId: BarId): Promise<TimeSheetIntegrity> {
    return this._queryBus.execute<GetTimeSheetIntegrityQuery, TimeSheetIntegrity>(
      new GetTimeSheetIntegrityQuery(barId),
    );
  }

  @Post()
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  create(@Param('barId') barId: BarId, @Body() dto: CreateTimeEntryDto, @CurrentUser() user: User): Promise<TimeEntry> {
    return this._commandBus.execute<CreateTimeEntryCommand, TimeEntry>(new CreateTimeEntryCommand(barId, user, dto));
  }

  @Post(':entryId/amend')
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  amend(
    @Param('barId') barId: BarId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: AmendTimeEntryDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<AmendTimeEntryCommand, TimeEntry>(
      new AmendTimeEntryCommand(barId, entryId, user, dto),
    );
  }

  @Post(':entryId/request-correction')
  @BarPermissions(BarPermission.BAR_REQUEST_TIME_CORRECTION)
  requestCorrection(
    @Param('barId') barId: BarId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: RequestTimeCorrectionDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<RequestTimeCorrectionCommand, TimeEntry>(
      new RequestTimeCorrectionCommand(barId, entryId, user, dto),
    );
  }

  @Post(':entryId/approve-correction')
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  approveCorrection(
    @Param('barId') barId: BarId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: ResolveTimeCorrectionDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<ResolveTimeCorrectionCommand, TimeEntry>(
      new ResolveTimeCorrectionCommand(barId, entryId, user, true, dto),
    );
  }

  @Post(':entryId/reject-correction')
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  rejectCorrection(
    @Param('barId') barId: BarId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: ResolveTimeCorrectionDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<ResolveTimeCorrectionCommand, TimeEntry>(
      new ResolveTimeCorrectionCommand(barId, entryId, user, false, dto),
    );
  }

  @Post(':entryId/void')
  @BarPermissions(BarPermission.BAR_MANAGE_TIME_ENTRIES)
  voidEntry(
    @Param('barId') barId: BarId,
    @Param('entryId') entryId: TimeEntryId,
    @Body() dto: VoidTimeEntryDto,
    @CurrentUser() user: User,
  ): Promise<TimeEntry> {
    return this._commandBus.execute<VoidTimeEntryCommand, TimeEntry>(
      new VoidTimeEntryCommand(barId, entryId, user, dto),
    );
  }

  #workdays(barId: BarId, query: TimeSheetQueryDto, userId?: UserId): Promise<Workday[]> {
    const today = formatWorkdayDate(toWorkdayDate(new Date()));

    return this._queryBus.execute<GetWorkdaysQuery, Workday[]>(
      new GetWorkdaysQuery(barId, query.from ?? today, query.to ?? query.from ?? today, userId),
    );
  }
}
