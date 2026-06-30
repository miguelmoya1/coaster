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

      let user = await this._db.dbUser.findUnique({
        where: { googleId: decodedToken.sub },
      });

      if (!user) {
        user = await this._db.dbUser.findUnique({
          where: { email: decodedToken.email },
        });
      }

      if (user) {
        user = await this._db.dbUser.update({
          where: { id: user.id },
          data: {
            googleId: decodedToken.sub,
            name: decodedToken.name || undefined,
            photoUrl: decodedToken.picture || undefined,
          },
        });
      } else {
        user = await this._db.dbUser.create({
          data: {
            email: decodedToken.email,
            googleId: decodedToken.sub,
            name: decodedToken.name || decodedToken.email.split('@')[0],
            photoUrl: decodedToken.picture || undefined,
          },
        });
      }

      return user;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
