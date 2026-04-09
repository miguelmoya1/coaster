import { asUserId, BarId, BarRole, ShiftExchangeId, ShiftId, User } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesService } from '../services/shift-exchanges.service';

@Controller('bars/:barId')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftExchangesController {
  constructor(private readonly _shiftExchangesService: ShiftExchangesService) {}

  @Get('exchanges')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  getExchanges(@Param('barId') barId: BarId) {
    return this._shiftExchangesService.getPendingExchanges(barId);
  }

  @Post('shifts/:shiftId/exchanges')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  createExchange(
    @Param('barId') barId: BarId,
    @Param('shiftId') shiftId: ShiftId,
    @Body() dto: CreateShiftExchangeDto,
    @CurrentUser() user: User,
  ) {
    return this._shiftExchangesService.requestExchange(barId, shiftId, asUserId(user.id), dto);
  }

  @Patch('exchanges/:exchangeId/accept')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  acceptExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ) {
    return this._shiftExchangesService.acceptExchange(barId, exchangeId, asUserId(user.id));
  }
}
