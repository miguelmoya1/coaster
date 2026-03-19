import { BarId, BarRole, User } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsService } from '../services/bars.service';

@Controller('bars')
@UseGuards(FirebaseAuthGuard)
export class BarsController {
  constructor(private readonly _barsService: BarsService) {}

  @Get()
  async getMyBars(@CurrentUser() user: User) {
    return this._barsService.getForUser(user);
  }

  @Get(':barId')
  @UseGuards(RolesGuard)
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getBar(@Param('barId') barId: BarId) {
    return this._barsService.get(barId);
  }

  @Post()
  async createBar(@CurrentUser() user: User, @Body() dto: CreateBarDto) {
    return this._barsService.create(dto, user);
  }
}
