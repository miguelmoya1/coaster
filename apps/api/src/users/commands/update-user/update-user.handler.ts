import type { User } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, void> {
  readonly #logger = new Logger(UpdateUserHandler.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    this.#logger.debug(`Executing UpdateUser...`);

    const { updateUserDto, id } = command;

    const userExists = await this.userRepository.findById(id);

    if (!userExists) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    await this.userRepository.update(id, {
      name: updateUserDto.name,
      photoUrl: updateUserDto.photoUrl,
    });
  }
}
