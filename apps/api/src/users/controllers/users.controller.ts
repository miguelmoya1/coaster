import type { User } from '@coaster/common';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../auth';
import { UpdateUserCommand } from '../commands';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersMapper } from '../mappers/users.mapper';

@Controller('users')
export class UsersController {
  constructor(private readonly _commandBus: CommandBus) {}

  @Get('me')
  @UseGuards(OptionalFirebaseAuthGuard)
  public findMe(@CurrentUser() user: User | null) {
    return user ? UsersMapper.toDto(user) : null;
  }

  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  public async updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this._commandBus.execute<UpdateUserCommand, User>(
      new UpdateUserCommand(user.id, updateUserDto),
    );
    return UsersMapper.toDto(updatedUser);
  }
}
