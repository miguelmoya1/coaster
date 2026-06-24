import { UpdateProductTemplateDto } from '../../dto/update-product-template.dto';

export class UpdateProductTemplateCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateProductTemplateDto,
  ) {}
}
