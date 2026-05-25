import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCategoryCommand } from './delete-category.command';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { BarGateway } from '../../../core';
import { SocketEvents } from '@coaster/common';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand, void> {
  constructor(
    private readonly repository: CategoriesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.repository.delete(command.categoryId);
    this._barGateway.server.to(command.barId).emit(SocketEvents.CATEGORY_DELETED, { id: command.categoryId });
  }
}
