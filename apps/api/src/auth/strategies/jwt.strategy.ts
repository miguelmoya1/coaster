import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { getAuth } from 'firebase-admin/auth';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { ErrorCodes } from '../../core';
import { DbService } from '../../core/db';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private readonly _db: DbService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  public async validate(token: string) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);

      if (!decodedToken || !decodedToken.sub || !decodedToken.email) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      // TODO: Replace for 2 queries and 1 command;
      const user = await this._db.dbUser.upsert({
        where: { email: decodedToken.email },
        update: {
          googleId: decodedToken.sub,
          name: decodedToken.name || undefined,
          photoUrl: decodedToken.picture || undefined,
        },
        create: {
          email: decodedToken.email,
          googleId: decodedToken.sub,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          photoUrl: decodedToken.picture || undefined,
        },
      });

      return user;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
