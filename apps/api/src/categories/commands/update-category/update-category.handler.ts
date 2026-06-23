import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesWriteRepository } from '../../data-access/categories.write.repository';
import { CategoryUpdatedEvent } from '../../events';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { UpdateCategoryCommand } from './update-category.command';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand, void> {
  readonly #logger = new Logger(UpdateCategoryHandler.name);

  constructor(
    private readonly repository: CategoriesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<void> {
    this.#logger.debug(`Executing updateCategory...`);
    const updated = await this.repository.update(command.barId, command.categoryId, command.dto);
    const mapped = CategoriesMapper.toDomain(updated);
    this.#logger.debug(`Publishing CategoryUpdatedEvent...`);
    this._eventBus.publish(new CategoryUpdatedEvent(command.barId, mapped));
  }
}
