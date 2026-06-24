import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { commonMapper } from '../../../core/mappers/common.mapper';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { DeleteProductTemplateCommand } from '../impl/delete-product-template.command';

@CommandHandler(DeleteProductTemplateCommand)
export class DeleteProductTemplateHandler implements ICommandHandler<DeleteProductTemplateCommand, any> {
  constructor(private readonly writeRepo: TemplatesWriteRepository) {}

  async execute(command: DeleteProductTemplateCommand): Promise<any> {
    await this.writeRepo.deleteProductTemplate(command.id);
    return commonMapper.getSuccessResponse();
  }
}
