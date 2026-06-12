import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { TemplatesMapper } from '../../mappers/templates.mapper';
import { UpdateProductTemplateCommand } from './update-product-template.command';

@CommandHandler(UpdateProductTemplateCommand)
export class UpdateProductTemplateHandler implements ICommandHandler<UpdateProductTemplateCommand, any> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: UpdateProductTemplateCommand): Promise<any> {
    const template = await this.writeRepo.updateProductTemplate(command.id, command.dto);
    return TemplatesMapper.toProductTemplate(template);
  }
}
