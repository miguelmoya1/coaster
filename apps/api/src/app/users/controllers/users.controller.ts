import { CurrentUserLogged } from '@coaster/interfaces';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../core';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { UserService } from '../services/user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  public async findMe(@CurrentUser() user: CurrentUserLogged) {
    if (!user) {
      return null;
    }

    return this.userService.getById(user.id);
  }
}
