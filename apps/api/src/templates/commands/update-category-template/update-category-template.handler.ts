import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCategoryTemplateCommand } from './update-category-template.command';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';

@CommandHandler(UpdateCategoryTemplateCommand)
export class UpdateCategoryTemplateHandler implements ICommandHandler<UpdateCategoryTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: UpdateCategoryTemplateCommand): Promise<any> {
    const template = await this._templatesRepository.updateCategoryTemplate(command.id, command.dto);
    return TemplatesMapper.toCategoryTemplate(template);
  }
}
