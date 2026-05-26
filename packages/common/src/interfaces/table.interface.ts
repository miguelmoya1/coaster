import { TableStatus } from '../constants/table-status.enum';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';

export type TableId = Brand<string, 'TableId'>;
export const asTableId = (id: string): TableId => id as TableId;

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
