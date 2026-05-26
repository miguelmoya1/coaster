import { type Bar, type BarId, type User } from '@coaster/common';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard, PermissionsGuard } from '../../core';
import { CreateBarCommand } from '../commands';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsMapper } from '../mappers/bars.mapper';
import { GetBarByIdQuery, GetBarsForUserQuery } from '../queries';

@Controller('bars')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class BarsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post()
  async createBar(@Body() createBarDto: CreateBarDto, @CurrentUser() user: User) {
    const result = await this._commandBus.execute<CreateBarCommand, { id: BarId }>(
      new CreateBarCommand(createBarDto, user),
    );
    return { id: result.id };
  }

  @Get()
  async getBars(@CurrentUser() user: User) {
    const bars = await this._queryBus.execute<GetBarsForUserQuery, Bar[]>(new GetBarsForUserQuery(user));
    return bars.map((b) => BarsMapper.toDto(b));
  }

  @Get(':barId')
  async getBar(@Param('barId') barId: BarId) {
    const bar = await this._queryBus.execute<GetBarByIdQuery, Bar | null>(new GetBarByIdQuery(barId));
    if (!bar) return null;
    return BarsMapper.toDto(bar);
  }
}
