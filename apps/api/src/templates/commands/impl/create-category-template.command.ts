import { CreateCategoryTemplateDto } from '../../dto/create-category-template.dto';

export class CreateCategoryTemplateCommand {
  constructor(public readonly dto: CreateCategoryTemplateDto) {}
}
