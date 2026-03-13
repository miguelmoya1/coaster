import { BarId, BarRole } from '@coaster/interfaces';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ShiftsService } from '../services/shifts.service';

@Controller('bars/:barId/shifts')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly _shiftsService: ShiftsService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  getShifts(
    @Param('barId') barId: BarId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this._shiftsService.getShifts(barId, startDate, endDate);
  }

  @Post()
  @Roles(BarRole.OWNER)
  createShift(
    @Param('barId') barId: BarId,
    @Body() dto: CreateShiftDto
  ) {
    return this._shiftsService.createShift(barId, dto);
  }
}
