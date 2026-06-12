import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UserPreparedForInviteEvent } from '../../../events';
import { UserWriteRepository } from '../../data-access/user.write.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { PrepareUserForInviteCommand } from './prepare-user-for-invite.command';

@CommandHandler(PrepareUserForInviteCommand)
export class PrepareUserForInviteHandler implements ICommandHandler<PrepareUserForInviteCommand, void> {
  readonly #logger = new Logger(PrepareUserForInviteHandler.name);

  constructor(
    private readonly writeRepo: UserWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PrepareUserForInviteCommand) {
    this.#logger.debug(`Executing prepareUserForInvite...`);
    const {
      email,
      extraData: { barId, role },
    } = command;

    const name = email.split('@').at(0) ?? 'User';

    const user = await this.writeRepo.upsert(email, { name, email });

    const userDomain = UsersMapper.toDomain(user);

    this.#logger.debug(`Publishing UserPreparedForInviteEvent...`);
    this.eventBus.publish(new UserPreparedForInviteEvent(userDomain.id, barId, role));
  }
}
