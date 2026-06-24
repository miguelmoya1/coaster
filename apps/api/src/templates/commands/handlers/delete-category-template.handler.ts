import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { commonMapper } from '../../../core/mappers/common.mapper';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { DeleteCategoryTemplateCommand } from '../impl/delete-category-template.command';

@CommandHandler(DeleteCategoryTemplateCommand)
export class DeleteCategoryTemplateHandler implements ICommandHandler<DeleteCategoryTemplateCommand, any> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: DeleteCategoryTemplateCommand): Promise<any> {
    await this.writeRepo.deleteCategoryTemplate(command.id);
    return commonMapper.getSuccessResponse();
  }
}
