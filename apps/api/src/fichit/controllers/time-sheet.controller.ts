import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, TimeEntry, User, UserId, Workday } from '@coaster/common';
import { ErrorCodes, EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, SkipSubscriptionCheck } from '@coaster/core';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { CorrectPunchDto, ManualPunchDto, TimeSheetQueryDto, VoidPunchDto } from '../dto/time-sheet.dto';
import { ClockingHandover, FichitSync } from '../services/fichit-sync.service';
import { FichitTimeSheet, TimeSheetIntegrity } from '../services/fichit-timesheet.service';

@Controller('establishments/:establishmentId/time-entries')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class TimeSheetController {
  constructor(
    private readonly sync: FichitSync,
    private readonly timeSheet: FichitTimeSheet,
  ) {}

  @Post('session')
  @SkipSubscriptionCheck()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOCK_IN)
  async session(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @CurrentUser() user: User,
  ): Promise<ClockingHandover> {
    const handover = await this.sync.handOverClocking(establishmentId, user.id);
    if (!handover) {
      throw new ServiceUnavailableException(ErrorCodes.FICHIT_NOT_AVAILABLE);
    }
    return handover;
  }

  @Get('me')
  @SkipSubscriptionCheck()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOCK_IN)
  myWorkdays(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
    @CurrentUser() user: User,
  ): Promise<Workday[]> {
    return this.timeSheet.workdays(establishmentId, { ...query, userId: user.id });
  }

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES)
  workdays(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
  ): Promise<Workday[]> {
    return this.timeSheet.workdays(establishmentId, { ...query, userId: query.userId as UserId | undefined });
  }

  @Get('punches')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES)
  punches(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
  ): Promise<TimeEntry[]> {
    return this.timeSheet.punches(establishmentId, { ...query, userId: query.userId as UserId | undefined });
  }

  @Get('export')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="registro-horario.csv"')
  export(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query() query: TimeSheetQueryDto,
  ): Promise<string> {
    return this.timeSheet.exportCsv(establishmentId, { ...query, userId: query.userId as UserId | undefined });
  }

  @Get('integrity')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  integrity(@Param('establishmentId') establishmentId: EstablishmentId): Promise<TimeSheetIntegrity> {
    return this.timeSheet.integrity(establishmentId);
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  record(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: ManualPunchDto,
  ): Promise<void> {
    return this.timeSheet.record(establishmentId, { ...dto, userId: dto.userId as UserId });
  }

  @Post(':punchId/amend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  amend(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('punchId') punchId: string,
    @Body() dto: CorrectPunchDto,
  ): Promise<void> {
    return this.timeSheet.correct(establishmentId, punchId, dto);
  }

  @Post(':punchId/void')
  @HttpCode(HttpStatus.NO_CONTENT)
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES)
  voidPunch(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('punchId') punchId: string,
    @Body() dto: VoidPunchDto,
  ): Promise<void> {
    return this.timeSheet.void(establishmentId, punchId, dto.reason);
  }
}
