import { ErrorCodes } from '@coaster/common';
import { FirebaseTokenService, UsersMapper } from '@coaster/core';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly _tokens: FirebaseTokenService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  public async validate(token: string) {
    const caller = await this._tokens.resolve(token);

    if (!caller?.decoded.email) {
      this.logger.warn('Rejected a token that does not identify a known user');
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    if (!caller.user || !caller.user.active) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    return UsersMapper.toDomain(caller.user);
  }
}
