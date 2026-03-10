import { User } from '@coaster/interfaces';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, OptionalFirebaseAuthGuard } from '../../core';

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(OptionalFirebaseAuthGuard)
  public async findMe(@CurrentUser() user: User) {
    return user;
  }
}
