import type { BarId, BarMember, BarMemberId, User } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import { InviteMemberCommand, RemoveMemberCommand } from '../commands';
import { InviteBarMemberDto } from '../dto/invite-bar-member.dto';
import { BarMembersMapper } from '../mappers/bar-members.mapper';
import { GetMemberMeQuery, GetMembersQuery } from '../queries';
import { BarPermission } from "@coaster/common";

@Controller('bars/:barId/members')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class BarMembersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('me')
  async getMyMember(@Param('barId') barId: BarId, @CurrentUser() user: User) {
    const member = await this._queryBus.execute<GetMemberMeQuery, BarMember>(new GetMemberMeQuery(barId, user));
    return BarMembersMapper.toDto(member);
  }

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_MEMBERS)
  async getMembers(@Param('barId') barId: BarId) {
    const members = await this._queryBus.execute<GetMembersQuery, BarMember[]>(new GetMembersQuery(barId));
    return members.map((member) => BarMembersMapper.toDto(member));
  }

  @Post()
  @BarPermissions(BarPermission.BAR_INVITE_MEMBER)
  async inviteMember(@Param('barId') barId: BarId, @Body() dto: InviteBarMemberDto, @CurrentUser() user: User) {
    await this._commandBus.execute(new InviteMemberCommand(barId, dto.email, user, dto.role));
  }

  @Delete(':memberId')
  @BarPermissions(BarPermission.BAR_REMOVE_MEMBER)
  async removeMember(@Param('barId') barId: BarId, @Param('memberId') memberId: BarMemberId) {
    await this._commandBus.execute(new RemoveMemberCommand(barId, memberId));
  }
}
