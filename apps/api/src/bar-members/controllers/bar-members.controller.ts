import { type BarId, type BarMemberId, BarRole, type User, type BarMember } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { InviteBarMemberDto } from '../dto/invite-bar-member.dto';
import { BarMembersMapper } from '../mappers/bar-members.mapper';
import { GetMembersQuery } from '../queries';
import { InviteMemberCommand, RemoveMemberCommand } from '../commands';

@Controller('bars/:barId/members')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BarMembersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getMembers(@Param('barId') barId: BarId) {
    const members = await this._queryBus.execute<GetMembersQuery, BarMember[]>(new GetMembersQuery(barId));
    return members.map((member) => BarMembersMapper.toDto(member));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async inviteMember(@Param('barId') barId: BarId, @Body() dto: InviteBarMemberDto, @CurrentUser() user: User) {
    const member = await this._commandBus.execute<InviteMemberCommand, BarMember>(new InviteMemberCommand(barId, dto.email, dto.role, user));
    return BarMembersMapper.toDto(member);
  }

  @Delete(':memberId')
  @Roles(BarRole.OWNER)
  async removeMember(@Param('barId') barId: BarId, @Param('memberId') memberId: BarMemberId) {
    await this._commandBus.execute<RemoveMemberCommand, void>(new RemoveMemberCommand(barId, memberId));
    return commonMapper.getSuccessResponse();
  }
}
