import { BarId, BarRole, User } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { InviteBarMemberDto } from '../dto/invite-bar-member.dto';
import { BarMembersService } from '../services/bar-members.service';

@Controller('bars/:barId/members')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BarMembersController {
  constructor(private readonly _barMembersService: BarMembersService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  getMembers(@Param('barId') barId: BarId) {
    return this._barMembersService.getMembers(barId);
  }

  @Post()
  @Roles(BarRole.OWNER)
  inviteMember(
    @Param('barId') barId: BarId,
    @Body() dto: InviteBarMemberDto,
    @CurrentUser() user: User,
  ) {
    return this._barMembersService.invite(barId, dto.email, dto.role, user);
  }
}
