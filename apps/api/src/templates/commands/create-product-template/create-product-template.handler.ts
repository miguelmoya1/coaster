import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductTemplateCommand } from './create-product-template.command';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';

@CommandHandler(CreateProductTemplateCommand)
export class CreateProductTemplateHandler implements ICommandHandler<CreateProductTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: CreateProductTemplateCommand): Promise<any> {
    const template = await this._templatesRepository.createProductTemplate(command.dto);
    return TemplatesMapper.toProductTemplate(template);
  }
}
