import { SecurityRepository } from '@coaster/core';
import { DbRole, DbService } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type { Socket } from 'socket.io';

@Injectable()
export class WsAuthService {
  private readonly _logger = new Logger(WsAuthService.name);

  constructor(
    private readonly _db: DbService,
    private readonly _securityRepository: SecurityRepository,
  ) {}

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

  public async canAccessBar(userId: string, barId: string): Promise<boolean> {
    const role = await this._securityRepository.getUserRole(userId);

    if (role === DbRole.ADMIN) {
      return true;
    }

    const membership = await this._securityRepository.getBarMemberRole(userId, barId);

    return Boolean(membership?.active);
  }
}
