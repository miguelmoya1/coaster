import { Bar, BarId } from './bar.interface';
import { Brand } from './brand.type';
import { Product } from './product.interface';

export type CategoryId = Brand<string, 'CategoryId'>;

export interface Category {
  id: CategoryId;
  barId: BarId;
  bar?: Bar;
  name: string;
  icon?: string;
  products?: Product[];
}

export interface CreateCategoryDto {
  name: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  name: string;
  icon?: string;
}
