import type { BarId, ShiftExchange, ShiftExchangeId, ShiftId, User } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { asUserId, BarPermissions, BarPermissionsGuard } from '../../core';
import { AcceptExchangeCommand, DeleteExchangeCommand, RequestExchangeCommand } from '../commands';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper } from '../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from '../queries';

@Controller('bars/:barId')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class ShiftExchangesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('exchanges')
  @BarPermissions(BarPermission.BAR_VIEW_EXCHANGES)
  async getExchanges(@Param('barId') barId: BarId) {
    const exchanges = await this._queryBus.execute<GetPendingExchangesQuery, ShiftExchange[]>(
      new GetPendingExchangesQuery(barId),
    );
    return exchanges.map((exchange) => ShiftExchangesMapper.toDto(exchange));
  }

  @Post('shifts/:shiftId/exchanges')
  @BarPermissions(BarPermission.BAR_CREATE_EXCHANGE)
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
  @BarPermissions(BarPermission.BAR_ACCEPT_EXCHANGE)
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
  @BarPermissions(BarPermission.BAR_DELETE_EXCHANGE)
  async deleteExchange(
    @Param('barId') barId: BarId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new DeleteExchangeCommand(barId, exchangeId, asUserId(user.id)));
  }
}
