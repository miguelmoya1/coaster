import type { Category, CategoryId } from '@coaster/categories';
import type { Brand } from '@coaster/core';
import { Allergen } from './allergen.type';
import type { StockStatus } from './stock-status.type';

export type ProductId = Brand<string, 'ProductId'>;

export interface ProductResponse {
  id: ProductId;
  name: string;
  categoryId: CategoryId;
  category?: Category;
  price: number;
  currentStock: number;
  minStockAlert: number;
  imageUrl?: string;
  icon?: string;
  taxRate: number;
  ownTaxRate?: number;
  allergens: Allergen[];
  lastUpdated: string;
}

export interface UpdateProductDto {
  name?: string;
  categoryId?: CategoryId;
  price?: number;
  minStockAlert?: number;
  imageUrl?: string;
  allergens?: Allergen[];
  icon?: string;
  ownTaxRate?: number | null;
}

export interface UpdateProductStockDto {
  currentStock: number;
}

export interface CreateProductDto {
  name: string;
  categoryId: CategoryId;
  price?: number;
  currentStock?: number;
  minStockAlert?: number;
  imageUrl?: string;
  allergens?: Allergen[];
  icon?: string;
  ownTaxRate?: number | null;
}

export const asProductId = (id: string): ProductId => id as ProductId;

export interface Product extends ProductResponse {
  stockStatus: StockStatus;
}
