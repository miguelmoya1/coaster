import type { User } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { UsersMapper } from '@coaster/core';
import { DbService } from '@coaster/core/db';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { getAuth } from 'firebase-admin/auth';
import { SyncUserCommand } from '../impl/sync-user.command';

@CommandHandler(SyncUserCommand)
export class SyncUserHandler implements ICommandHandler<SyncUserCommand, User> {
  private readonly logger = new Logger(SyncUserHandler.name);

  constructor(private readonly _db: DbService) {}

  async execute(command: SyncUserCommand): Promise<User> {
    try {
      const decodedToken = await getAuth().verifyIdToken(command.token);

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
            this.logger.warn(`Could not synchronize data for user ${user.id}: ${updateError?.message}`);
          }
        }

        return UsersMapper.toDomain(user);
      }

      user = await this._db.dbUser.findUnique({
        where: { email: decodedToken.email },
      });

      if (user) {
        if (user.googleId) {
          this.logger.warn(`Refusing to move ${decodedToken.email} onto a different sign-in account`);
          throw new UnauthorizedException(ErrorCodes.EMAIL_ALREADY_LINKED);
        }

        if (decodedToken.email_verified !== true) {
          this.logger.warn(`Refusing to claim ${decodedToken.email} from a token that does not vouch for the address`);
          throw new UnauthorizedException(ErrorCodes.EMAIL_NOT_VERIFIED);
        }

        return UsersMapper.toDomain(
          await this._db.dbUser.update({
            where: { id: user.id },
            data: { googleId: decodedToken.sub },
          }),
        );
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
        return UsersMapper.toDomain(user);
      } catch (error: any) {
        if (error?.code === 'P2002') {
          user = await this._db.dbUser.findUnique({
            where: { email: decodedToken.email },
          });
          if (user) return UsersMapper.toDomain(user);
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error validating Firebase JWT token:', error);
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }
  }
}
