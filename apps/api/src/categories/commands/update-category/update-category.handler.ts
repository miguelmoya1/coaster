import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { UpdateCategoryCommand } from './update-category.command';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand, void> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(command: UpdateCategoryCommand): Promise<void> {
    await this.repository.update(command.barId, command.categoryId, command.dto);
  }
}
