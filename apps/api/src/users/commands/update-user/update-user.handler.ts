import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserCommand } from './update-user.command';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { User } from '@coaster/common';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, User> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const user = await this.userRepository.update(command.id, {
      name: command.dto.name,
      photoUrl: command.dto.photoUrl,
    });
    return UsersMapper.toDomain(user);
  }
}
