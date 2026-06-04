import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CreateCategoryCommand } from './create-category.command';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand, void> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(command: CreateCategoryCommand): Promise<void> {
    await this.repository.create(command.barId, command.dto);
  }
}
