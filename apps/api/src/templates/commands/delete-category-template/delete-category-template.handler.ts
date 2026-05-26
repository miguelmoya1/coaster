import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { commonMapper } from '../../../core/mappers/common.mapper';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { DeleteCategoryTemplateCommand } from './delete-category-template.command';

@CommandHandler(DeleteCategoryTemplateCommand)
export class DeleteCategoryTemplateHandler implements ICommandHandler<DeleteCategoryTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: DeleteCategoryTemplateCommand): Promise<any> {
    await this._templatesRepository.deleteCategoryTemplate(command.id);
    return commonMapper.getSuccessResponse();
  }
}
