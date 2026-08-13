import { TableStatus } from '../constants/table-status.type';
import { EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';

export type TableId = Brand<string, 'TableId'>;

export interface Table {
  id: TableId;
  establishmentId: EstablishmentId;
  name: string;
  status: TableStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTableDto {
  name: string;
}

export interface UpdateTableDto {
  name?: string;
}
