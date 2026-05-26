import { BarRole } from '../constants/bar-role.enum';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type BarId = Brand<string, 'BarId'>;

export const asBarId = (id: string): BarId => id as BarId;

export interface Bar {
  id: BarId;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBarDto {
  name: string;
}

