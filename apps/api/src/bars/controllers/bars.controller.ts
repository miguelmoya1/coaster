import type { Bar, BarId, User } from '@coaster/common';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { Admin, AdminGuard, BarPermissionsGuard } from '../../core';
import { CreateBarCommand } from '../commands';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsMapper } from '../mappers/bars.mapper';
import { GetBarByIdQuery, GetBarsForUserQuery, SearchBarsAsAdminQuery } from '../queries';

@Controller('bars')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post()
  async createBar(@Body() createBarDto: CreateBarDto, @CurrentUser() user: User): Promise<void> {
    await this._commandBus.execute<CreateBarCommand, void>(new CreateBarCommand(createBarDto, user));
  }

  @Get()
  async getBars(@CurrentUser() user: User): Promise<Bar[]> {
    const bars = await this._queryBus.execute<GetBarsForUserQuery, Bar[]>(new GetBarsForUserQuery(user));
    return bars.map((b) => BarsMapper.toDto(b));
  }

  @Get('admin/search')
  @Admin()
  @UseGuards(AdminGuard)
  async searchBarsAsAdmin(@Query('q') query: string): Promise<Bar[]> {
    if (!query) return [];
    const bars = await this._queryBus.execute<SearchBarsAsAdminQuery, Bar[]>(new SearchBarsAsAdminQuery(query));
    return bars.map((b) => BarsMapper.toDto(b));
  }

  @Get(':barId')
  async getBar(@Param('barId') barId: BarId): Promise<Bar | null> {
    const bar = await this._queryBus.execute<GetBarByIdQuery, Bar | null>(new GetBarByIdQuery(barId));
    if (!bar) {
      return null;
    }

    return BarsMapper.toDto(bar);
  }
}
