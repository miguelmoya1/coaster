import { ErrorCodes } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { hashRefreshToken, isWithinReuseGrace } from '../../domain/session';
import { IssuedSession, SessionService } from '../../services/session.service';
import { RefreshSessionCommand } from '../impl/refresh-session.command';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand, IssuedSession> {
  readonly #logger = new Logger(RefreshSessionHandler.name);

  constructor(
    private readonly _db: DbService,
    private readonly _repo: AuthSessionRepository,
    private readonly _sessions: SessionService,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<IssuedSession> {
    if (!command.refreshToken) {
      throw new UnauthorizedException(ErrorCodes.SESSION_EXPIRED);
    }

    const session = await this._repo.findByTokenHash(hashRefreshToken(command.refreshToken));
    const now = new Date();

    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedException(ErrorCodes.SESSION_EXPIRED);
    }

    if (session.rotatedAt && !isWithinReuseGrace(session.rotatedAt, now)) {
      this.#logger.warn(`Refresh token replayed for user ${session.userId}; dropping the whole family`);
      await this._repo.revokeFamily(session.familyId);
      throw new UnauthorizedException(ErrorCodes.SESSION_EXPIRED);
    }

    const user = await this._db.dbUser.findUnique({
      where: { id: session.userId },
      include: { preferences: true },
    });

    if (!user || !user.active) {
      await this._repo.revokeFamily(session.familyId);
      throw new UnauthorizedException(ErrorCodes.SESSION_EXPIRED);
    }

    return this._sessions.rotate(session.id, session.familyId, user, command.origin);
  }
}
