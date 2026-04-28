import { type BarId, BarRole, type User } from '@coaster/common';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsMapper } from '../mappers/bars.mapper';
import { BarsService } from '../services/bars.service';

@Controller('bars')
@UseGuards(FirebaseAuthGuard)
export class BarsController {
  constructor(private readonly _barsService: BarsService) {}

  @Get()
  async getMyBars(@CurrentUser() user: User) {
    const bars = await this._barsService.getForUser(user);
    return bars.map(BarsMapper.toDto);
  }

  @Get(':barId')
  @UseGuards(RolesGuard)
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getBar(@Param('barId') barId: BarId) {
    const bar = await this._barsService.get(barId);
    return bar ? BarsMapper.toDto(bar) : null;
  }

  @Post()
  async createBar(@CurrentUser() user: User, @Body() dto: CreateBarDto) {
    const bar = await this._barsService.create(dto, user);
    return BarsMapper.toDto(bar);
  }
}
