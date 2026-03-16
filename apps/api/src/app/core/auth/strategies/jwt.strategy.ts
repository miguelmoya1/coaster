import { ErrorCodes } from '@coaster/logic';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GoogleOAuthService } from '../services/google-oauth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  constructor(
    private readonly _googleOAuthService: GoogleOAuthService,
    private readonly _prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  public async validate(token: string) {
    try {
      const ticket = await this._googleOAuthService.client.verifyIdToken({
        idToken: token,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      const user = await this._prisma.user.upsert({
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
    } catch {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
