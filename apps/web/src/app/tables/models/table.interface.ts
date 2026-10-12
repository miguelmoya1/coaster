import type { EstablishmentId, Brand } from '@coaster/core';
import { TableStatus } from './table-status.type';

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

export const asTableId = (id: string): TableId => id as TableId;
