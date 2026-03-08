import { Brand } from './brand.type';
import { ProductStatus } from './enums';

export type ProductId = Brand<string, 'ProductId'>;
export type CategoryId = Brand<string, 'CategoryId'>;

export const asProductId = (id: string): ProductId => id as ProductId;
export const asCategoryId = (id: string): CategoryId => id as CategoryId;

export interface Category {
  id: CategoryId;
  name: string;
  icon?: string;
}

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
