import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { CreateCategoryTemplateCommand } from './create-category-template.command';

@CommandHandler(CreateCategoryTemplateCommand)
export class CreateCategoryTemplateHandler implements ICommandHandler<CreateCategoryTemplateCommand, void> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: CreateCategoryTemplateCommand): Promise<void> {
    await this._templatesRepository.createCategoryTemplate(command.dto);
  }
}
