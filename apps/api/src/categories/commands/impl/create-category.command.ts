import type { EstablishmentId } from '@coaster/common';
import { CreateCategoryDto } from '../../dto/create-category.dto';

export class CreateCategoryCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateCategoryDto,
  ) {}
}
