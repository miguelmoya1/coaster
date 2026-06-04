import type { BarId, ShiftExchangeId, ShiftId, User, ShiftExchange } from '@coaster/common';
import { asUserId, BarPermission } from '../../core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Permissions, PermissionsGuard } from '../../core';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper, ExchangeWithRelations } from '../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from '../queries';
import { RequestExchangeCommand, AcceptExchangeCommand, DeleteExchangeCommand } from '../commands';

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
  ): Promise<void> {
    await this._commandBus.execute<RequestExchangeCommand, void>(
      new RequestExchangeCommand(barId, shiftId, asUserId(user.id), dto),
    );
  }

  @Patch('exchanges/:exchangeId/accept')
  @Permissions(BarPermission.ACCEPT_EXCHANGE)
  async acceptExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute<AcceptExchangeCommand, void>(
      new AcceptExchangeCommand(barId, exchangeId, asUserId(user.id)),
    );
  }

  @Delete('exchanges/:exchangeId')
  @Permissions(BarPermission.DELETE_EXCHANGE)
  async deleteExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new DeleteExchangeCommand(barId, exchangeId, asUserId(user.id)));
  }
}
