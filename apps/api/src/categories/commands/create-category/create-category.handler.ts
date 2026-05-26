import { Category } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { CategoriesMapper } from '../../mappers/categories.mapper';
import { CreateCategoryCommand } from './create-category.command';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand, Category> {
  constructor(private readonly repository: CategoriesRepository) {}

  async execute(command: CreateCategoryCommand): Promise<Category> {
    const category = await this.repository.create(command.barId, command.dto);
    return CategoriesMapper.toDomain(category);
  }
}
