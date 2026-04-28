import { BarId, BarRole } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsMapper } from '../mappers/shifts.mapper';
import { ShiftsService } from '../services/shifts.service';

@Controller('bars/:barId/shifts')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly _shiftsService: ShiftsService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getShifts(
    @Param('barId') barId: BarId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const shifts = await this._shiftsService.getShifts(barId, startDate, endDate);
    return shifts.map(ShiftsMapper.toDto);
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createShift(@Param('barId') barId: BarId, @Body() dto: CreateShiftDto) {
    const shift = await this._shiftsService.createShift(barId, dto);
    return ShiftsMapper.toDto(shift);
  }
}
