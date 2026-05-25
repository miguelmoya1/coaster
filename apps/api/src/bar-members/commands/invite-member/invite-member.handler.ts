import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InviteMemberCommand } from './invite-member.command';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { EmailService } from '../../../core';
import { BarMembersMapper } from '../../mappers/bar-members.mapper';
import { BarMember, ErrorCodes } from '@coaster/common';
import { ConflictException, NotFoundException } from '@nestjs/common';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, BarMember> {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: InviteMemberCommand): Promise<BarMember> {
    const bar = await this.repository.findBarById(command.barId);
    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    try {
      const membership = await this.repository.inviteMember(command.barId, command.email, {
        role: command.role,
      });

      await this.emailService.sendInviteEmail(command.email, bar.name, command.user.name);
      return BarMembersMapper.toDomain(membership);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'P2002'
      ) {
        throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
      }
      throw error;
    }
  }
}
