import { User } from '@coaster/interfaces';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, OptionalJwtAuthGuard } from '../../core';

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  public async findMe(@CurrentUser() user: User) {
    return user;
  }
}
