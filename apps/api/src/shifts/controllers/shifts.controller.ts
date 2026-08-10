import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, Shift, ShiftId } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateShiftCommand, DeleteShiftCommand } from '../commands';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsMapper } from '../mappers/shifts.mapper';
import { GetShiftsQuery } from '../queries';

@Controller('establishments/:establishmentId/shifts')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class ShiftsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS)
  async getShifts(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const shifts = await this._queryBus.execute<GetShiftsQuery, Shift[]>(
      new GetShiftsQuery(establishmentId, startDate, endDate),
    );
    return shifts.map((shift) => ShiftsMapper.toDto(shift));
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT)
  async createShift(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateShiftDto,
  ): Promise<void> {
    await this._commandBus.execute<CreateShiftCommand, void>(new CreateShiftCommand(establishmentId, dto));
  }

  @Delete(':shiftId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_SHIFT)
  async deleteShift(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('shiftId') shiftId: ShiftId,
  ): Promise<void> {
    await this._commandBus.execute(new DeleteShiftCommand(establishmentId, shiftId));
  }
}
