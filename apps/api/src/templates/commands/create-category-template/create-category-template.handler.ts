import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { CreateCategoryTemplateCommand } from './create-category-template.command';

@CommandHandler(CreateCategoryTemplateCommand)
export class CreateCategoryTemplateHandler implements ICommandHandler<CreateCategoryTemplateCommand, void> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: CreateCategoryTemplateCommand): Promise<void> {
    await this.writeRepo.createCategoryTemplate(command.dto);
  }
}
