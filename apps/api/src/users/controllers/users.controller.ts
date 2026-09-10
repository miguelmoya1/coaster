import { CurrentUser, AuthGuard, OptionalAuthGuard } from '@coaster/auth';
import type { User } from '@coaster/common';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateUserCommand } from '../commands';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersMapper } from '@coaster/core';

@Controller('users')
export class UsersController {
  constructor(private readonly _commandBus: CommandBus) {}

  @Get('me')
  @UseGuards(OptionalAuthGuard)
  public findMe(@CurrentUser() user: User | null) {
    return user ? UsersMapper.toDto(user) : null;
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  public async updateMe(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto): Promise<void> {
    await this._commandBus.execute<UpdateUserCommand, void>(new UpdateUserCommand(user.id, updateUserDto));
  }
}
