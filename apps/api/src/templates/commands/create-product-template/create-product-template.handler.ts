import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { CreateProductTemplateCommand } from './create-product-template.command';

@CommandHandler(CreateProductTemplateCommand)
export class CreateProductTemplateHandler implements ICommandHandler<CreateProductTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: CreateProductTemplateCommand): Promise<any> {
    const template = await this._templatesRepository.createProductTemplate(command.dto);
    return TemplatesMapper.toProductTemplate(template);
  }
}
