import { asUserId, type BarId, BarRole, type ShiftExchangeId, type ShiftId, type User } from '@coaster/common';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper } from '../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from '../queries';
import { RequestExchangeCommand, AcceptExchangeCommand } from '../commands';

@Controller('bars/:barId')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ShiftExchangesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('exchanges')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getExchanges(@Param('barId') barId: BarId) {
    const exchanges = await this._queryBus.execute<GetPendingExchangesQuery, any[]>(new GetPendingExchangesQuery(barId));
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
    const exchange = await this._commandBus.execute<RequestExchangeCommand, any>(new RequestExchangeCommand(barId, shiftId, asUserId(user.id), dto));
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }

  @Patch('exchanges/:exchangeId/accept')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async acceptExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ) {
    const exchange = await this._commandBus.execute<AcceptExchangeCommand, any>(new AcceptExchangeCommand(barId, exchangeId, asUserId(user.id)));
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }
}
