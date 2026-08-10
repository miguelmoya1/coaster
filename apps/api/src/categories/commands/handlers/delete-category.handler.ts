import { ErrorCodes } from '@coaster/common';
import { isRecordNotFoundError } from '@coaster/core';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesWriteRepository } from '../../data-access/categories.write.repository';
import { CategoryDeletedEvent } from '../../events';
import { DeleteCategoryCommand } from '../impl/delete-category.command';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, void> {
  readonly #logger = new Logger(DeleteCategoryHandler.name);

  constructor(
    private readonly repository: CategoriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    this.#logger.debug(`Executing deleteCategory...`);

    try {
      await this.repository.delete(command.establishmentId, command.categoryId);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException(ErrorCodes.CATEGORY_NOT_FOUND);
      }

      throw error;
    }

    this.#logger.debug(`Publishing CategoryDeletedEvent...`);
    this._eventBus.publish(new CategoryDeletedEvent(command.establishmentId, command.categoryId));
  }
}
