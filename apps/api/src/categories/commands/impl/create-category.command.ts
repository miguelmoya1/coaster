import type { BarId } from '@coaster/common';
import { CreateCategoryDto } from '../../dto/create-category.dto';

export class CreateCategoryCommand {
  constructor(
    public readonly barId: BarId,
    public readonly dto: CreateCategoryDto,
  ) {}
}
