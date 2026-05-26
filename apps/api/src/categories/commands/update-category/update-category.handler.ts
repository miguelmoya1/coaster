import { Category } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { UpdateCategoryCommand } from './update-category.command';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand, Category> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(command: UpdateCategoryCommand): Promise<Category> {
    const category = await this.repository.update(command.barId, command.categoryId, command.dto);
    return CategoriesMapper.toDomain(category);
  }
}
