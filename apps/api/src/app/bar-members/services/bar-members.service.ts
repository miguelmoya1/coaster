import { BarId, BarRole, User } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../../core';
import { BarMembersRepository } from '../data-access/bar-members.repository';

@Injectable()
export class BarMembersService {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly emailService: EmailService,
  ) {}

  async getMembers(barId: BarId) {
    return this.repository.getMembersByBar(barId);
  }

  async invite(barId: BarId, email: string, role: BarRole, user: User) {
    const bar = await this.repository.findBarById(barId);
    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    try {
      const membership = await this.repository.inviteMember(barId, email, {
        role,
      });

      await this.emailService.sendInviteEmail(email, bar.name, user.name);

      return membership;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
      }
      throw error;
    }
  }
}
