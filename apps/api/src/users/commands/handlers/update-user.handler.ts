import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserReadRepository } from '../../data-access/user.read.repository';
import { UserWriteRepository } from '../../data-access/user.write.repository';
import { UpdateUserCommand } from '../impl/update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, void> {
  readonly #logger = new Logger(UpdateUserHandler.name);

  constructor(
    private readonly readRepo: UserReadRepository,
    private readonly writeRepo: UserWriteRepository,
  ) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    this.#logger.debug(`Executing UpdateUser...`);

    const { updateUserDto, id } = command;

    const userExists = await this.readRepo.findById(id);

    if (!userExists) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    await this.writeRepo.update(id, {
      name: updateUserDto.name,
      photoUrl: updateUserDto.photoUrl,
      language: updateUserDto.language,
    });
  }
}
