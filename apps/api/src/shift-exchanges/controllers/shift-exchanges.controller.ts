import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, ShiftExchange, ShiftExchangeId, ShiftId, User } from '@coaster/common';
import { asUserId, EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AcceptExchangeCommand, DeleteExchangeCommand, RequestExchangeCommand } from '../commands';
import { CreateShiftExchangeDto } from '../dto/create-shift-exchange.dto';
import { ShiftExchangesMapper } from '../mappers/shift-exchanges.mapper';
import { GetPendingExchangesQuery } from '../queries';

@Controller('establishments/:establishmentId')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class ShiftExchangesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('exchanges')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_EXCHANGES)
  async getExchanges(@Param('establishmentId') establishmentId: EstablishmentId) {
    const exchanges = await this._queryBus.execute<GetPendingExchangesQuery, ShiftExchange[]>(
      new GetPendingExchangesQuery(establishmentId),
    );
    return exchanges.map((exchange) => ShiftExchangesMapper.toDto(exchange));
  }

  @Post('shifts/:shiftId/exchanges')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_EXCHANGE)
  async createExchange(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('shiftId') shiftId: ShiftId,
    @Body() dto: CreateShiftExchangeDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute<RequestExchangeCommand, void>(
      new RequestExchangeCommand(establishmentId, shiftId, asUserId(user.id), dto),
    );
  }

  @Patch('exchanges/:exchangeId/accept')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_ACCEPT_EXCHANGE)
  async acceptExchange(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute<AcceptExchangeCommand, void>(
      new AcceptExchangeCommand(establishmentId, exchangeId, asUserId(user.id)),
    );
  }

  @Delete('exchanges/:exchangeId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_EXCHANGE)
  async deleteExchange(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('exchangeId') exchangeId: ShiftExchangeId,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new DeleteExchangeCommand(establishmentId, exchangeId, asUserId(user.id)));
  }
}
