import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type {
  AdminEstablishmentDetail,
  AdminEstablishmentSummary,
  EstablishmentId,
  Paginated,
  User,
} from '@coaster/common';
import { Admin, AdminGuard, SkipSubscriptionCheck } from '@coaster/core';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GrantEstablishmentPlanCommand, RenameEstablishmentCommand, RevokeEstablishmentPlanCommand } from '../commands';
import {
  AdminEstablishmentsQueryDto,
  GrantEstablishmentPlanDto,
  RenameEstablishmentDto,
  RevokeEstablishmentPlanDto,
} from '../dto';
import { GetAdminEstablishmentDetailQuery, ListAdminEstablishmentsQuery } from '../queries';

@Controller('admin/establishments')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
@SkipSubscriptionCheck()
export class AdminEstablishmentsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  async listEstablishments(@Query() query: AdminEstablishmentsQueryDto): Promise<Paginated<AdminEstablishmentSummary>> {
    return await this._queryBus.execute(new ListAdminEstablishmentsQuery(query));
  }

  @Get(':establishmentId')
  async getEstablishmentDetail(
    @Param('establishmentId') establishmentId: EstablishmentId,
  ): Promise<AdminEstablishmentDetail> {
    return await this._queryBus.execute(new GetAdminEstablishmentDetailQuery(establishmentId));
  }

  @Patch(':establishmentId')
  async renameEstablishment(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: RenameEstablishmentDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new RenameEstablishmentCommand(establishmentId, dto.name, user));
  }

  @Post(':establishmentId/plan')
  async grantPlan(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: GrantEstablishmentPlanDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new GrantEstablishmentPlanCommand(establishmentId, dto, user));
  }

  @Post(':establishmentId/plan/revoke')
  async revokePlan(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: RevokeEstablishmentPlanDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new RevokeEstablishmentPlanCommand(establishmentId, dto, user));
  }
}
