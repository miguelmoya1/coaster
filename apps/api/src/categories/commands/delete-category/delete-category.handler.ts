import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoryDeletedEvent } from '../../../events';
import { DeleteCategoryCommand } from './delete-category.command';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, void> {
  readonly #logger = new Logger(DeleteCategoryHandler.name);

  constructor(
    private readonly repository: CategoriesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    this.#logger.debug(`Executing deleteCategory...`);
    await this.repository.delete(command.categoryId);
    this.#logger.debug(`Publishing CategoryDeletedEvent...`);
    this._eventBus.publish(new CategoryDeletedEvent(command.barId, command.categoryId));
  }
}
