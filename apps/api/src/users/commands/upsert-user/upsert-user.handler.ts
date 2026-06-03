import type { User } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { UpsertUserCommand } from './upsert-user.command';

@CommandHandler(UpsertUserCommand)
export class UpsertUserHandler implements ICommandHandler<UpsertUserCommand, User> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpsertUserCommand): Promise<User> {
    const user = await this.userRepository.upsert(command.dto.email, {
      email: command.dto.email,
      name: command.dto.name,
      photoUrl: command.dto.photoUrl,
      googleId: command.dto.googleId,
    });
    return UsersMapper.toDomain(user);
  }
}
