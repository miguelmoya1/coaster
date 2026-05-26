import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { commonMapper } from '../../../core/mappers/common.mapper';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { DeleteProductTemplateCommand } from './delete-product-template.command';

@CommandHandler(DeleteProductTemplateCommand)
export class DeleteProductTemplateHandler implements ICommandHandler<DeleteProductTemplateCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: DeleteProductTemplateCommand): Promise<any> {
    await this._templatesRepository.deleteProductTemplate(command.id);
    return commonMapper.getSuccessResponse();
  }
}
