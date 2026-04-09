import { User } from '@coaster/interfaces';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../core';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  @Get('me')
  @UseGuards(OptionalFirebaseAuthGuard)
  public async findMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  public async updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user.id, updateUserDto);
  }
}
