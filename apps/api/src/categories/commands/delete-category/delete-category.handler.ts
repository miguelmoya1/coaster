import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DeleteCategoryCommand } from './delete-category.command';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoryDeletedEvent } from '../../events';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, void> {
  constructor(
    private readonly repository: CategoriesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.repository.delete(command.categoryId);
    this._eventBus.publish(new CategoryDeletedEvent(command.barId, command.categoryId));
  }
}
