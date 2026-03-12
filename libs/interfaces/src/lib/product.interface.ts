import { Brand } from './brand.type';
import { Category, CategoryId } from './category.interface';
import { ProductStatus } from './enums';

export type ProductId = Brand<string, 'ProductId'>;

export const asProductId = (id: string): ProductId => id as ProductId;

export interface Product {
  id: ProductId;
  name: string;
  categoryId: CategoryId;
  category?: Category;
  status: ProductStatus;
  lastUpdated: string;
}

export interface UpdateProductStatusDto {
  status: ProductStatus;
}
