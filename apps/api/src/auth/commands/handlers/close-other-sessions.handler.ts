import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { CloseOtherSessionsCommand } from '../impl/close-other-sessions.command';

@CommandHandler(CloseOtherSessionsCommand)
export class CloseOtherSessionsHandler implements ICommandHandler<CloseOtherSessionsCommand, void> {
  constructor(private readonly _sessions: AuthSessionRepository) {}

  async execute(command: CloseOtherSessionsCommand): Promise<void> {
    const current = command.currentSessionId
      ? await this._sessions.findOwnedBy(command.currentSessionId, command.userId)
      : null;

    // No row behind the token this call came with: there is nothing to spare, so everything goes.
    if (!current) {
      await this._sessions.revokeEverySessionOf(command.userId);

      return;
    }

    // Keeping the family, not just the row, so the session running this refreshes as usual.
    await this._sessions.revokeEveryOtherFamilyOf(command.userId, current.familyId);
  }
}
