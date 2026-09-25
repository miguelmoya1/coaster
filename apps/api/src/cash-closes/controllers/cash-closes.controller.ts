import { AuthGuard, CurrentUser } from '@coaster/auth';
import type { CashClose, CashClosePreview, EstablishmentId, User } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import {
  EstablishmentModulesGuard,
  EstablishmentPermissions,
  EstablishmentPermissionsGuard,
  RequiresModule,
} from '@coaster/core';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CloseCashCommand } from '../commands';
import { CloseCashDto } from '../dto/close-cash.dto';
import { GetCashClosePreviewQuery, GetCashClosesQuery } from '../queries';

@Controller('establishments/:establishmentId/cash-closes')
@UseGuards(AuthGuard, EstablishmentPermissionsGuard, EstablishmentModulesGuard)
@RequiresModule(EstablishmentModule.ORDERS)
export class CashClosesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS)
  async getCashCloses(@Param('establishmentId') establishmentId: EstablishmentId): Promise<CashClose[]> {
    return this._queryBus.execute<GetCashClosesQuery, CashClose[]>(new GetCashClosesQuery(establishmentId));
  }

  @Get('preview')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOSE_CASH)
  async getPreview(@Param('establishmentId') establishmentId: EstablishmentId): Promise<CashClosePreview> {
    return this._queryBus.execute<GetCashClosePreviewQuery, CashClosePreview>(
      new GetCashClosePreviewQuery(establishmentId),
    );
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CLOSE_CASH)
  async closeCash(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CloseCashDto,
    @CurrentUser() user: User,
  ): Promise<CashClose> {
    return this._commandBus.execute<CloseCashCommand, CashClose>(new CloseCashCommand(establishmentId, user.id, dto));
  }
}
