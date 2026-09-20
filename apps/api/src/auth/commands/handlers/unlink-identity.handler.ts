import { ErrorCodes } from '@coaster/common';
import { DbAuthEventType, DbService } from '@coaster/core/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AuthEventOccurred } from '../../events/impl/auth-event.event';
import { UnlinkIdentityCommand } from '../impl/unlink-identity.command';

@CommandHandler(UnlinkIdentityCommand)
export class UnlinkIdentityHandler implements ICommandHandler<UnlinkIdentityCommand, void> {
  constructor(
    private readonly _db: DbService,
    private readonly _events: EventBus,
  ) {}

  async execute(command: UnlinkIdentityCommand): Promise<void> {
    const user = await this._db.dbUser.findUnique({
      where: { id: command.userId },
      include: { identities: true },
    });

    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    if (!user.identities.some((identity) => identity.provider === command.provider)) {
      throw new BadRequestException(ErrorCodes.IDENTITY_NOT_LINKED);
    }

    const waysIn = user.identities.length + (user.passwordHash ? 1 : 0);

    if (waysIn <= 1) {
      throw new BadRequestException(ErrorCodes.LAST_WAY_IN);
    }

    await this._db.dbAuthIdentity.deleteMany({ where: { userId: command.userId, provider: command.provider } });

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.IDENTITY_UNLINKED,
        userId: user.id,
        email: user.email,
        ...command.origin,
        metadata: { provider: command.provider },
      }),
    );
  }
}
