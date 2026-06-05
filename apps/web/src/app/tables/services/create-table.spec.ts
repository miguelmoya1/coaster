import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TableRepository } from '../data-access/table-repository';
import { CreateTable } from './create-table';

describe('CreateTable', () => {
  let service: CreateTable;
  let tableRepoMock: Record<string, Mock>;

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
    it('should delegate to repository', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'Mesa 1' };
      tableRepoMock['create'].mockResolvedValue(undefined);

      await service.execute(barId, dto);

      expect(tableRepoMock['create']).toHaveBeenCalledWith(barId, dto);
    });
  });
});
