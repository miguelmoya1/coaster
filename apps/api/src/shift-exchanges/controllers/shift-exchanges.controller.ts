import { asUserId, type BarId, BarRole, type ShiftExchangeId, type ShiftId, type User } from '@coaster/common';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper } from '../mappers/shift-exchanges.mapper';
import { ShiftExchangesService } from '../services/shift-exchanges.service';

@Controller('bars/:barId')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftExchangesController {
  constructor(private readonly _shiftExchangesService: ShiftExchangesService) {}

  @Get('exchanges')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getExchanges(@Param('barId') barId: BarId) {
    const exchanges = await this._shiftExchangesService.getPendingExchanges(barId);
    return exchanges.map((exchange) => ShiftExchangesMapper.toDto(exchange));
  }

  @Post('shifts/:shiftId/exchanges')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async createExchange(
    @Param('barId') barId: BarId,
    @Param('shiftId') shiftId: ShiftId,
    @Body() dto: CreateShiftExchangeDto,
    @CurrentUser() user: User,
  ) {
    const exchange = await this._shiftExchangesService.requestExchange(barId, shiftId, asUserId(user.id), dto);
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }

  @Patch('exchanges/:exchangeId/accept')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async acceptExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ) {
    const exchange = await this._shiftExchangesService.acceptExchange(barId, exchangeId, asUserId(user.id));
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }
}
