import { Establishment, EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';
import { Product } from './product.interface';

export type CategoryId = Brand<string, 'CategoryId'>;

export interface Category {
  id: CategoryId;
  establishmentId: EstablishmentId;
  establishment?: Establishment;
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
