import { BarId, BarRole, User } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { InviteBarMemberDto } from '../dto/invite-bar-member.dto';
import { BarMembersMapper } from '../mappers/bar-members.mapper';
import { BarMembersService } from '../services/bar-members.service';

@Controller('bars/:barId/members')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BarMembersController {
  constructor(private readonly _barMembersService: BarMembersService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getMembers(@Param('barId') barId: BarId) {
    const members = await this._barMembersService.getMembers(barId);
    return members.map(BarMembersMapper.toDto);
  }

  @Post()
  @Roles(BarRole.OWNER)
  async inviteMember(@Param('barId') barId: BarId, @Body() dto: InviteBarMemberDto, @CurrentUser() user: User) {
    const member = await this._barMembersService.invite(barId, dto.email, dto.role, user);

    return BarMembersMapper.toDto(member);
  }
}
