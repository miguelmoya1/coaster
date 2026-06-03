import { TableStatus } from '../constants/table-status.type';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';

export type TableId = Brand<string, 'TableId'>;

export interface Table {
  id: TableId;
  barId: BarId;
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
