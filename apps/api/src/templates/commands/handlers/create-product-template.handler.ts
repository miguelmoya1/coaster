import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { CreateProductTemplateCommand } from '../impl/create-product-template.command';

@CommandHandler(CreateProductTemplateCommand)
export class CreateProductTemplateHandler implements ICommandHandler<CreateProductTemplateCommand, void> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: CreateProductTemplateCommand): Promise<void> {
    await this.writeRepo.createProductTemplate(command.dto);
  }
}
