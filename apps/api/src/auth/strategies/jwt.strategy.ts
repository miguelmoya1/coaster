import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as admin from 'firebase-admin';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { ErrorCodes } from '../../core';
import { DbService } from '../../db';;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private readonly _prisma: DbService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  public async validate(token: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      const payload = decodedToken;

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      // TODO: Replace for 2 queries and 1 command;
      const user = await this._prisma.dbUser.upsert({
        where: { email: payload.email },
        update: {
          googleId: payload.sub,
          name: payload.name || undefined,
          photoUrl: payload.picture || undefined,
        },
        create: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.name || payload.email.split('@')[0],
          photoUrl: payload.picture || undefined,
        },
      });

      return user;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
