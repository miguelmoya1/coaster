import { UpdateCategoryTemplateDto } from '../../dto/update-category-template.dto';

export class UpdateCategoryTemplateCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateCategoryTemplateDto,
  ) {}
}
