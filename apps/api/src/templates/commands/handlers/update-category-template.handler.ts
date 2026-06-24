import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { UpdateCategoryTemplateCommand } from '../impl/update-category-template.command';

@CommandHandler(UpdateCategoryTemplateCommand)
export class UpdateCategoryTemplateHandler implements ICommandHandler<UpdateCategoryTemplateCommand, any> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: UpdateCategoryTemplateCommand): Promise<any> {
    const template = await this.writeRepo.updateCategoryTemplate(command.id, command.dto);
    return TemplatesMapper.toCategoryTemplate(template);
  }
}
