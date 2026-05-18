import { TestBed } from '@angular/core/testing';
import { asBarId, asTableId, Table, TableStatus } from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TableRepository } from '../data-access/table-repository';
import { CreateTable } from './create-table';

describe('CreateTable', () => {
  let service: CreateTable;
  let tableRepoMock: Record<string, Mock>;

  const mockTable: Table = {
    id: asTableId('table-1'),
    barId: asBarId('bar-1'),
    name: 'Mesa 1',
    status: TableStatus.FREE,
  };

  beforeEach(() => {
    tableRepoMock = {
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TableRepository, useValue: tableRepoMock }],
    });

    service = TestBed.inject(CreateTable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'Mesa 1' };
      tableRepoMock['create'].mockResolvedValue(mockTable);

      const result = await service.execute(barId, dto);

      expect(tableRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockTable);
    });
  });
});
