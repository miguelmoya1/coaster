import type { BarId, CategoryId } from '@coaster/common';
import { UpdateCategoryDto } from '../../dto/update-category.dto';

export class UpdateCategoryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly categoryId: CategoryId,
    public readonly dto: UpdateCategoryDto,
  ) {}
}
