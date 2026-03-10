import { CreateBarDto, User } from '@coaster/interfaces';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { BarsService } from '../services/bars.service';

@Controller('bars')
@UseGuards(FirebaseAuthGuard)
export class BarsController {
  constructor(private readonly barsService: BarsService) {}

  @Post()
  async createBar(@CurrentUser() user: User, @Body() dto: CreateBarDto) {
    return this.barsService.createBar(user.id, dto);
  }

  @Get('my-bars')
  async getMyBars(@CurrentUser() user: User) {
    return this.barsService.getUserBars(user.id);
  }
}
