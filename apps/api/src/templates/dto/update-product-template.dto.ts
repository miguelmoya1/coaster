import { PartialType } from '@nestjs/mapped-types';
import { CreateProductTemplateDto } from './create-product-template.dto';

export class UpdateProductTemplateDto extends PartialType(CreateProductTemplateDto) {}
