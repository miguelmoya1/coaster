import { type BarId, BarRole } from '@coaster/common';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsMapper } from '../mappers/shifts.mapper';
import { GetShiftsQuery } from '../queries';
import { CreateShiftCommand } from '../commands';

@Controller('bars/:barId/shifts')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getShifts(
    @Param('barId') barId: BarId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const shifts = await this._queryBus.execute(new GetShiftsQuery(barId, startDate, endDate));
    return shifts.map((shift) => ShiftsMapper.toDto(shift));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createShift(@Param('barId') barId: BarId, @Body() dto: CreateShiftDto) {
    const shift = await this._commandBus.execute(new CreateShiftCommand(barId, dto));
    return ShiftsMapper.toDto(shift);
  }
}
