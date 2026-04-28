import { BarId, BarRole, ErrorCodes, SocketEvents, User } from '@coaster/common';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BarGateway, EmailService } from '../../core';
import { BarMembersRepository } from '../data-access/bar-members.repository';
import { BarMembersMapper } from '../mappers/bar-members.mapper';

@Injectable()
export class BarMembersService {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly emailService: EmailService,
    private readonly _barGateway: BarGateway,
  ) {}

  async getMembers(barId: BarId) {
    const members = await this.repository.getMembersByBar(barId);

    return members.map(BarMembersMapper.toDomain);
  }

  async invite(barId: BarId, email: string, role: BarRole = BarRole.STAFF, user: User) {
    const bar = await this.repository.findBarById(barId);
    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    try {
      const membership = await this.repository.inviteMember(barId, email, {
        role,
      });

      await this.emailService.sendInviteEmail(email, bar.name, user.name);

      return BarMembersMapper.toDomain(membership);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
      }
      throw error;
    }
  }

  async removeMember(barId: BarId, memberId: string) {
    await this.repository.removeMember(memberId);
    this._barGateway.server.to(barId).emit(SocketEvents.MEMBER_REMOVED, { id: memberId });
  }
}
