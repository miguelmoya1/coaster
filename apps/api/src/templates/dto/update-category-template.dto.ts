import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryTemplateDto } from './create-category-template.dto';

export class UpdateCategoryTemplateDto extends PartialType(CreateCategoryTemplateDto) {}
