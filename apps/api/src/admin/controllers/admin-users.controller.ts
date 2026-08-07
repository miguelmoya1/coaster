import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { AdminUserDetail, AdminUserSummary, Paginated, User, UserId } from '@coaster/common';
import { Admin, AdminGuard } from '@coaster/core';
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UpdateAdminUserCommand } from '../commands';
import { AdminUsersQueryDto, UpdateAdminUserDto } from '../dto';
import { GetAdminUserDetailQuery, ListAdminUsersQuery } from '../queries';

@Controller('admin/users')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminUsersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  async listUsers(@Query() query: AdminUsersQueryDto): Promise<Paginated<AdminUserSummary>> {
    return await this._queryBus.execute(new ListAdminUsersQuery(query));
  }

  @Get(':userId')
  async getUserDetail(@Param('userId') userId: UserId): Promise<AdminUserDetail> {
    return await this._queryBus.execute(new GetAdminUserDetailQuery(userId));
  }

  @Patch(':userId')
  async updateUser(
    @Param('userId') userId: UserId,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() actor: User,
  ): Promise<void> {
    await this._commandBus.execute(new UpdateAdminUserCommand(userId, dto, actor));
  }
}
