import { Injectable, Logger } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type { Socket } from 'socket.io';
import { DbRole, DbService } from '../../core/db';
import { SecurityRepository } from '../../core/security/data-access/security.repository';

/**
 * Socket.IO connections bypass the HTTP guard chain entirely, so the gateway needs its own
 * authentication. This mirrors what `JwtStrategy` + `BarPermissionsGuard` do for REST: verify the
 * Firebase token, resolve our user, and only then decide which bar rooms that user may enter.
 */
@Injectable()
export class WsAuthService {
  private readonly _logger = new Logger(WsAuthService.name);

  constructor(
    private readonly _db: DbService,
    private readonly _securityRepository: SecurityRepository,
  ) {}

  /**
   * Reads the Firebase ID token from the handshake. Clients may send it either as
   * `auth: { token }` (preferred) or as an `Authorization: Bearer` header.
   */
  public extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth as { token?: unknown } | undefined;

    if (typeof auth?.token === 'string' && auth.token.length > 0) {
      return auth.token.replace(/^Bearer\s+/i, '');
    }

    const header = client.handshake?.headers?.authorization;

    if (typeof header === 'string' && header.length > 0) {
      return header.replace(/^Bearer\s+/i, '');
    }

    return null;
  }

  /** Resolves the local user id for a handshake token, or `null` when the token is not usable. */
  public async authenticate(client: Socket): Promise<string | null> {
    const token = this.extractToken(client);

    if (!token) {
      this._logger.warn(`Socket ${client.id} attempted to connect without a token`);
      return null;
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);

      if (!decodedToken?.sub) {
        return null;
      }

      const user = await this._db.dbUser.findUnique({
        where: { googleId: decodedToken.sub },
        select: { id: true },
      });

      if (!user) {
        this._logger.warn(`Socket ${client.id} presented a token for an unknown user`);
        return null;
      }

      return user.id;
    } catch {
      this._logger.warn(`Socket ${client.id} presented an invalid token`);
      return null;
    }
  }

  /** A user may only join a bar room if they are a platform admin or an active member of it. */
  public async canAccessBar(userId: string, barId: string): Promise<boolean> {
    const role = await this._securityRepository.getUserRole(userId);

    if (role === DbRole.ADMIN) {
      return true;
    }

    const membership = await this._securityRepository.getBarMemberRole(userId, barId);

    return Boolean(membership?.active);
  }
}
