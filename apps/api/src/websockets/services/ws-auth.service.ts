import { FirebaseTokenService, SecurityRepository } from '@coaster/core';
import { DbRole } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';

@Injectable()
export class WsAuthService {
  private readonly _logger = new Logger(WsAuthService.name);

  constructor(
    private readonly _tokens: FirebaseTokenService,
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

    const caller = await this._tokens.resolve(token);

    if (!caller) {
      this._logger.warn(`Socket ${client.id} presented an invalid token`);
      return null;
    }

    if (!caller.user) {
      this._logger.warn(`Socket ${client.id} presented a token for an unknown user`);
      return null;
    }

    if (!caller.user.active) {
      this._logger.warn(`Socket ${client.id} presented a token for a deactivated user`);
      return null;
    }

    return caller.user.id;
  }

  public async canAccessEstablishment(userId: string, establishmentId: string): Promise<boolean> {
    const role = await this._securityRepository.getUserRole(userId);

    if (role === DbRole.ADMIN) {
      return true;
    }

    const membership = await this._securityRepository.getEstablishmentMemberRole(userId, establishmentId);

    return Boolean(membership?.active);
  }
}
