import type { EstablishmentId, Brand } from '@coaster/core';
import type { Establishment } from '@coaster/establishments';
import type { ProductResponse } from '@coaster/products';

export type CategoryId = Brand<string, 'CategoryId'>;

export interface Category {
  id: CategoryId;
  establishmentId: EstablishmentId;
  establishment?: Establishment;
  name: string;
  icon?: string;
  taxRate: number;
  products?: ProductResponse[];
}

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  taxRate?: number;
}

export interface UpdateCategoryDto {
  name: string;
  icon?: string;
  taxRate?: number;
}

export const asCategoryId = (id: string): CategoryId => id as CategoryId;
