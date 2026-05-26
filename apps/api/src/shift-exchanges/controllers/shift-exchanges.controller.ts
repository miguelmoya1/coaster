import {
  asUserId,
  type BarId,
  BarPermission,
  type ShiftExchangeId,
  type ShiftId,
  type User,
  type ShiftExchange,
} from '@coaster/common';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard, Permissions, PermissionsGuard } from '../../core';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper, ExchangeWithRelations } from '../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from '../queries';
import { RequestExchangeCommand, AcceptExchangeCommand } from '../commands';

@Controller('bars/:barId')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class ShiftExchangesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('exchanges')
  @Permissions(BarPermission.VIEW_EXCHANGES)
  async getExchanges(@Param('barId') barId: BarId) {
    const exchanges = await this._queryBus.execute<GetPendingExchangesQuery, ShiftExchange[]>(
      new GetPendingExchangesQuery(barId),
    );
    return exchanges.map((exchange) => ShiftExchangesMapper.toDto(exchange));
  }

  @Post('shifts/:shiftId/exchanges')
  @Permissions(BarPermission.CREATE_EXCHANGE)
  async createExchange(
    @Param('barId') barId: BarId,
    @Param('shiftId') shiftId: ShiftId,
    @Body() dto: CreateShiftExchangeDto,
    @CurrentUser() user: User,
  ) {
    const exchange = await this._commandBus.execute<RequestExchangeCommand, ExchangeWithRelations>(
      new RequestExchangeCommand(barId, shiftId, asUserId(user.id), dto),
    );
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }

  @Patch('exchanges/:exchangeId/accept')
  @Permissions(BarPermission.ACCEPT_EXCHANGE)
  async acceptExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ) {
    const exchange = await this._commandBus.execute<AcceptExchangeCommand, ExchangeWithRelations>(
      new AcceptExchangeCommand(barId, exchangeId, asUserId(user.id)),
    );
    return ShiftExchangesMapper.toDto(ShiftExchangesMapper.toDomain(exchange));
  }
}
