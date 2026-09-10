import { CurrentUser, AuthGuard } from '@coaster/auth';
import type { AdminBetaTesters, BetaTesterId, User } from '@coaster/common';
import { Admin, AdminGuard } from '@coaster/core';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AddBetaTesterCommand, RemoveBetaTesterCommand } from '../commands';
import { AddBetaTesterDto, AdminBetaTestersQueryDto } from '../dto';
import { ListBetaTestersQuery } from '../queries';

@Controller('admin/beta-testers')
@Admin()
@UseGuards(AuthGuard, AdminGuard)
export class AdminBetaTestersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  async listBetaTesters(@Query() query: AdminBetaTestersQueryDto): Promise<AdminBetaTesters> {
    return await this._queryBus.execute(new ListBetaTestersQuery(query));
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async addBetaTester(@Body() dto: AddBetaTesterDto, @CurrentUser() actor: User): Promise<void> {
    await this._commandBus.execute(new AddBetaTesterCommand(dto, actor));
  }

  @Delete(':betaTesterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBetaTester(@Param('betaTesterId') betaTesterId: BetaTesterId, @CurrentUser() actor: User): Promise<void> {
    await this._commandBus.execute(new RemoveBetaTesterCommand(betaTesterId, actor));
  }
}
