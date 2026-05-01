import { ErrorCodes } from '@coaster/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as admin from 'firebase-admin';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { PrismaService } from '../../prisma/services/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(private readonly _prisma: PrismaService) {
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

      const user = await this._prisma.user.upsert({
        where: { email: payload.email },
        update: {
          googleId: payload.sub,
          name: (payload.name as string | undefined) || undefined,
          photoUrl: payload.picture || undefined,
        },
        create: {
          email: payload.email,
          googleId: payload.sub,
          name: (payload.name as string | undefined) || payload.email.split('@')[0],
          photoUrl: payload.picture || undefined,
        },
      });

      return user;
    } catch {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
