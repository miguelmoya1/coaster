import type { BarId, BarMember, BarMemberId, User } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { BarPermission, Permissions, PermissionsGuard } from '../../core';
import { PrepareInviteMemberCommand, RemoveMemberCommand } from '../commands';
import { InviteBarMemberDto } from '../dto/invite-bar-member.dto';
import { BarMembersMapper } from '../mappers/bar-members.mapper';
import { GetMemberMeQuery, GetMembersQuery } from '../queries';

@Controller('bars/:barId/members')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
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
  @Permissions(BarPermission.VIEW_MEMBERS)
  async getMembers(@Param('barId') barId: BarId) {
    const members = await this._queryBus.execute<GetMembersQuery, BarMember[]>(new GetMembersQuery(barId));
    return members.map((member) => BarMembersMapper.toDto(member));
  }

  @Post()
  @Permissions(BarPermission.INVITE_MEMBER)
  async inviteMember(@Param('barId') barId: BarId, @Body() dto: InviteBarMemberDto, @CurrentUser() user: User) {
    await this._commandBus.execute(new PrepareInviteMemberCommand(barId, dto.email, user, dto.role));
  }

  @Delete(':memberId')
  @Permissions(BarPermission.REMOVE_MEMBER)
  async removeMember(@Param('barId') barId: BarId, @Param('memberId') memberId: BarMemberId) {
    await this._commandBus.execute(new RemoveMemberCommand(barId, memberId));
  }
}
