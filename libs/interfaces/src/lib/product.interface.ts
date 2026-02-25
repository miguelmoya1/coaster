import { ProductStatus } from './enums';

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  status: ProductStatus;
  lastUpdated: string;
}

export interface UpdateProductStatusDto {
  status: ProductStatus;
}
