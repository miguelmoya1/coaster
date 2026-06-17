import type { BarId, Shift, ShiftId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermission, Permissions, PermissionsGuard } from '../../core';
import { CreateShiftCommand, DeleteShiftCommand } from '../commands';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsMapper } from '../mappers/shifts.mapper';
import { GetShiftsQuery } from '../queries';

@Controller('bars/:barId/shifts')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class ShiftsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Permissions(BarPermission.VIEW_SHIFTS)
  async getShifts(
    @Param('barId') barId: BarId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const shifts = await this._queryBus.execute<GetShiftsQuery, Shift[]>(new GetShiftsQuery(barId, startDate, endDate));
    return shifts.map((shift) => ShiftsMapper.toDto(shift));
  }

  @Post()
  @Permissions(BarPermission.CREATE_SHIFT)
  async createShift(@Param('barId') barId: BarId, @Body() dto: CreateShiftDto): Promise<void> {
    await this._commandBus.execute<CreateShiftCommand, void>(new CreateShiftCommand(barId, dto));
  }

  @Delete(':shiftId')
  @Permissions(BarPermission.DELETE_SHIFT)
  async deleteShift(@Param('barId') barId: BarId, @Param('shiftId') shiftId: ShiftId): Promise<void> {
    await this._commandBus.execute(new DeleteShiftCommand(barId, shiftId));
  }
}
