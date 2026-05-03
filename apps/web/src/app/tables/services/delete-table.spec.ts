import { TestBed } from '@angular/core/testing';
import { asBarId, asTableId } from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TableRepository } from '../data-access/table-repository';
import { DeleteTable } from './delete-table';

describe('DeleteTable', () => {
  let service: DeleteTable;
  let tableRepoMock: Record<string, Mock>;

  beforeEach(() => {
    tableRepoMock = {
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TableRepository, useValue: tableRepoMock }],
    });

    service = TestBed.inject(DeleteTable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('delete', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const tableId = asTableId('table-1');
      tableRepoMock['delete'].mockResolvedValue({ success: true });

      const result = await service.delete(barId, tableId);

      expect(tableRepoMock['delete']).toHaveBeenCalledWith(barId, tableId);
      expect(result).toEqual({ success: true });
    });
  });
});
