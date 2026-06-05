import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CategoryCreatedEvent } from '../../../events';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { CreateCategoryCommand } from './create-category.command';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand, void> {
  readonly #logger = new Logger(CreateCategoryHandler.name);

  constructor(
    private readonly repository: CategoriesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<void> {
    this.#logger.debug(`Executing createCategory...`);
    const created = await this.repository.create(command.barId, command.dto);
    const mapped = CategoriesMapper.toDomain(created);
    this.#logger.debug(`Publishing CategoryCreatedEvent...`);
    this._eventBus.publish(new CategoryCreatedEvent(command.barId, mapped));
  }
}
