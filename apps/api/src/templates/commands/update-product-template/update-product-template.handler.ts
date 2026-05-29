import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { UpdateProductTemplateCommand } from './update-product-template.command';

@CommandHandler(UpdateProductTemplateCommand)
export class UpdateProductTemplateHandler implements ICommandHandler<UpdateProductTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: UpdateProductTemplateCommand): Promise<any> {
    const template = await this._templatesRepository.updateProductTemplate(command.id, command.dto);
    return TemplatesMapper.toProductTemplate(template);
  }
}
