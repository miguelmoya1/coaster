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

      let user = await this._db.dbUser.findUnique({
        where: { googleId: decodedToken.sub },
      });

      if (user) {
        const emailChanged = decodedToken.email && user.email !== decodedToken.email;
        const nameChanged = decodedToken.name && user.name !== decodedToken.name;
        const photoChanged = decodedToken.picture && user.photoUrl !== decodedToken.picture;

        if (emailChanged || nameChanged || photoChanged) {
          try {
            user = await this._db.dbUser.update({
              where: { id: user.id },
              data: {
                ...(emailChanged && { email: decodedToken.email }),
                ...(nameChanged && { name: decodedToken.name }),
                ...(photoChanged && { photoUrl: decodedToken.picture }),
              },
            });
          } catch (updateError: any) {
            this.logger.warn(`No se pudieron sincronizar los datos del usuario ${user.id}: ${updateError?.message}`);
          }
        }

        return user;
      }

      user = await this._db.dbUser.findUnique({
        where: { email: decodedToken.email },
      });

      if (user) {
        return await this._db.dbUser.update({
          where: { id: user.id },
          data: { googleId: decodedToken.sub },
        });
      }

      try {
        user = await this._db.dbUser.create({
          data: {
            email: decodedToken.email,
            googleId: decodedToken.sub,
            name: decodedToken.name || decodedToken.email.split('@')[0],
            photoUrl: decodedToken.picture || null,
          },
        });
        return user;
      } catch (error: any) {
        if (error?.code === 'P2002') {
          user = await this._db.dbUser.findUnique({
            where: { email: decodedToken.email },
          });
          if (user) return user;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error validando token JWT de Firebase:', error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
