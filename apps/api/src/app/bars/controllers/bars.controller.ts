import { User } from '@coaster/interfaces';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateBarDto } from '../dto/create-bar.dto';
import { BarsService } from '../services/bars.service';

@Controller('bars')
@UseGuards(FirebaseAuthGuard)
export class BarsController {
  constructor(private readonly _barsService: BarsService) {}

  @Post()
  async createBar(@CurrentUser() user: User, @Body() dto: CreateBarDto) {
    return this._barsService.create(user.id, dto);
  }

  @Get()
  async getMyBars(@CurrentUser() user: User) {
    return this._barsService.getForUser(user.id);
  }
}
