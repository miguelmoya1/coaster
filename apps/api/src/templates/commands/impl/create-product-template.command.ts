import { CreateProductTemplateDto } from '../../dto/create-product-template.dto';

export class CreateProductTemplateCommand {
  constructor(public readonly dto: CreateProductTemplateDto) {}
}
