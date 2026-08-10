import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, EstablishmentMember, EstablishmentMemberId, User } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InviteMemberCommand, RemoveMemberCommand, UpdateMemberRoleCommand } from '../commands';
import { InviteEstablishmentMemberDto } from '../dto/invite-establishment-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { EstablishmentMembersMapper } from '../mappers/establishment-members.mapper';
import { GetMemberMeQuery, GetMembersQuery } from '../queries';

@Controller('establishments/:establishmentId/members')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class EstablishmentMembersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('me')
  async getMyMember(@Param('establishmentId') establishmentId: EstablishmentId, @CurrentUser() user: User) {
    const member = await this._queryBus.execute<GetMemberMeQuery, EstablishmentMember>(
      new GetMemberMeQuery(establishmentId, user),
    );
    return EstablishmentMembersMapper.toDto(member);
  }

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_MEMBERS)
  async getMembers(@Param('establishmentId') establishmentId: EstablishmentId) {
    const members = await this._queryBus.execute<GetMembersQuery, EstablishmentMember[]>(
      new GetMembersQuery(establishmentId),
    );
    return members.map((member) => EstablishmentMembersMapper.toDto(member));
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER)
  async inviteMember(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: InviteEstablishmentMemberDto,
    @CurrentUser() user: User,
  ) {
    await this._commandBus.execute(new InviteMemberCommand(establishmentId, dto.email, user, dto.role));
  }

  @Patch(':memberId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_MEMBER_ROLE)
  async updateMemberRole(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('memberId') memberId: EstablishmentMemberId,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User,
  ) {
    await this._commandBus.execute(new UpdateMemberRoleCommand(establishmentId, memberId, dto.role, user));
  }

  @Delete(':memberId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_REMOVE_MEMBER)
  async removeMember(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('memberId') memberId: EstablishmentMemberId,
  ) {
    await this._commandBus.execute(new RemoveMemberCommand(establishmentId, memberId));
  }
}
