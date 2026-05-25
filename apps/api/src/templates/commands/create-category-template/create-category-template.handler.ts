import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCategoryTemplateCommand } from './create-category-template.command';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';

@CommandHandler(CreateCategoryTemplateCommand)
export class CreateCategoryTemplateHandler implements ICommandHandler<CreateCategoryTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: CreateCategoryTemplateCommand): Promise<any> {
    const template = await this._templatesRepository.createCategoryTemplate(command.dto);
    return TemplatesMapper.toCategoryTemplate(template);
  }
}
