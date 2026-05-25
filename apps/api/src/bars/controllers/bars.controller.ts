import { type BarId, BarRole, type User } from '@coaster/common';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsMapper } from '../mappers/bars.mapper';
import { GetBarByIdQuery, GetBarsForUserQuery } from '../queries';
import { CreateBarCommand } from '../commands';

@Controller('bars')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BarsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post()
  async createBar(@Body() createBarDto: CreateBarDto, @CurrentUser() user: User) {
    const result = await this._commandBus.execute(new CreateBarCommand(createBarDto, user)) as { id: BarId };
    return { id: result.id };
  }

  @Get()
  async getBars(@CurrentUser() user: User) {
    const bars = await this._queryBus.execute(new GetBarsForUserQuery(user));
    return bars.map((b) => BarsMapper.toDto(b));
  }

  @Get(':barId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getBar(@Param('barId') barId: BarId) {
    const bar = await this._queryBus.execute(new GetBarByIdQuery(barId));
    if (!bar) return null;
    return BarsMapper.toDto(bar);
  }
}
