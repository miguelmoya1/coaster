import { Brand } from './brand.type';
import { Category, CategoryId } from './category.interface';

export type ProductId = Brand<string, 'ProductId'>;
export const asProductId = (id: string): ProductId => id as ProductId;

export interface Product {
  id: ProductId;
  name: string;
  categoryId: CategoryId;
  category?: Category;
  currentStock: number;
  minStockAlert: number;
  lastUpdated: string;
}

export interface UpdateProductStockDto {
  currentStock: number;
  minStockAlert: number;
}

export interface CreateProductDto {
  name: string;
  categoryId: CategoryId;
  currentStock?: number;
  minStockAlert?: number;
}
