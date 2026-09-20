import { ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { CloseSessionCommand } from '../impl/close-session.command';

@CommandHandler(CloseSessionCommand)
export class CloseSessionHandler implements ICommandHandler<CloseSessionCommand, void> {
  constructor(private readonly _sessions: AuthSessionRepository) {}

  async execute(command: CloseSessionCommand): Promise<void> {
    const session = await this._sessions.findOwnedBy(command.sessionId, command.userId);

    if (!session) {
      throw new NotFoundException(ErrorCodes.SESSION_NOT_FOUND);
    }

    const current = command.currentSessionId
      ? await this._sessions.findOwnedBy(command.currentSessionId, command.userId)
      : null;

    if (current && current.familyId === session.familyId) {
      throw new BadRequestException(ErrorCodes.CANNOT_CLOSE_CURRENT_SESSION);
    }

    await this._sessions.revokeFamily(session.familyId);
  }
}
