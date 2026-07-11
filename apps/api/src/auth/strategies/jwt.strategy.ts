import { ErrorCodes } from '@coaster/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { getAuth } from 'firebase-admin/auth';
import { ExtractJwt, Strategy } from 'passport-firebase-jwt';
import { DbService } from '../../core/db';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly _db: DbService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  public async validate(token: string) {
    try {
      const decodedToken = await getAuth().verifyIdToken(token);

      if (!decodedToken?.sub || !decodedToken?.email) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      const user = await this._db.dbUser.findUnique({
        where: { googleId: decodedToken.sub },
      });

      if (!user) {
        throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
      }

      return user;
    } catch (error) {
      this.logger.error('Error validating Firebase JWT token:', error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
