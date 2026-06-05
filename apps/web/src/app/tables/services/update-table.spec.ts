import { TestBed } from '@angular/core/testing';
import type { Table } from '@coaster/common';
import { asBarId, asTableId, TableStatus } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TableRepository } from '../data-access/table-repository';
import { UpdateTable } from './update-table';

describe('UpdateTable', () => {
  let service: UpdateTable;
  let tableRepoMock: Record<string, Mock>;

  const mockTable: Table = {
    id: asTableId('table-1'),
    barId: asBarId('bar-1'),
    name: 'Mesa Actualizada',
    status: TableStatus.FREE,
  };

  beforeEach(() => {
    tableRepoMock = {
      update: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TableRepository, useValue: tableRepoMock }],
    });

    service = TestBed.inject(UpdateTable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const tableId = asTableId('table-1');
      const dto = { name: 'Mesa Actualizada' };
      tableRepoMock['update'].mockResolvedValue(mockTable);

      const result = await service.execute(barId, tableId, dto);

      expect(tableRepoMock['update']).toHaveBeenCalledWith(barId, tableId, dto);
      expect(result).toEqual(mockTable);
    });
  });
});
