import { User } from '@coaster/common';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../core';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersMapper } from '../mappers/users.mapper';
import { UserService } from '../services/user.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  @Get('me')
  @UseGuards(OptionalFirebaseAuthGuard)
  public async findMe(@CurrentUser() user: User) {
    return user ? UsersMapper.toDto(user) : user;
  }

  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  public async updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    return UsersMapper.toDto(updatedUser);
  }
}
