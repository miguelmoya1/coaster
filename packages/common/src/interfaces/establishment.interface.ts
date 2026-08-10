import { EstablishmentRole } from '../constants/establishment-role.type';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type EstablishmentId = Brand<string, 'EstablishmentId'>;

export interface Establishment {
  id: EstablishmentId;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEstablishmentDto {
  name: string;
}
