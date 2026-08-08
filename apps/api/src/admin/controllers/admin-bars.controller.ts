import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { AdminBarDetail, AdminBarSummary, BarId, Paginated, User } from '@coaster/common';
import { Admin, AdminGuard, SkipSubscriptionCheck } from '@coaster/core';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GrantBarPlanCommand, RenameBarCommand, RevokeBarPlanCommand } from '../commands';
import { AdminBarsQueryDto, GrantBarPlanDto, RenameBarDto, RevokeBarPlanDto } from '../dto';
import { GetAdminBarDetailQuery, ListAdminBarsQuery } from '../queries';

@Controller('admin/bars')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
@SkipSubscriptionCheck()
export class AdminBarsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  async listBars(@Query() query: AdminBarsQueryDto): Promise<Paginated<AdminBarSummary>> {
    return await this._queryBus.execute(new ListAdminBarsQuery(query));
  }

  @Get(':barId')
  async getBarDetail(@Param('barId') barId: BarId): Promise<AdminBarDetail> {
    return await this._queryBus.execute(new GetAdminBarDetailQuery(barId));
  }

  @Patch(':barId')
  async renameBar(@Param('barId') barId: BarId, @Body() dto: RenameBarDto, @CurrentUser() user: User): Promise<void> {
    await this._commandBus.execute(new RenameBarCommand(barId, dto.name, user));
  }

  @Post(':barId/plan')
  async grantPlan(
    @Param('barId') barId: BarId,
    @Body() dto: GrantBarPlanDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new GrantBarPlanCommand(barId, dto, user));
  }

  @Post(':barId/plan/revoke')
  async revokePlan(
    @Param('barId') barId: BarId,
    @Body() dto: RevokeBarPlanDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute(new RevokeBarPlanCommand(barId, dto, user));
  }
}
