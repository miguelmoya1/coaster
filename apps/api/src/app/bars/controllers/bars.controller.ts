import { CreateBarDto, CurrentUserLogged } from '@coaster/interfaces';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { BarsService } from '../services/bars.service';

@Controller('bars')
@UseGuards(JwtAuthGuard)
export class BarsController {
  constructor(private readonly barsService: BarsService) {}

  @Post()
  async createBar(
    @CurrentUser() user: CurrentUserLogged,
    @Body() dto: CreateBarDto,
  ) {
    if (!user) return null;
    return this.barsService.createBar(user.id, dto);
  }

  @Get('my-bars')
  async getMyBars(@CurrentUser() user: CurrentUserLogged) {
    if (!user) return [];
    return this.barsService.getUserBars(user.id);
  }
}
