import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { CreateProductTemplateCommand } from './create-product-template.command';

@CommandHandler(CreateProductTemplateCommand)
export class CreateProductTemplateHandler implements ICommandHandler<CreateProductTemplateCommand, void> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: CreateProductTemplateCommand): Promise<void> {
    await this._templatesRepository.createProductTemplate(command.dto);
  }
}
