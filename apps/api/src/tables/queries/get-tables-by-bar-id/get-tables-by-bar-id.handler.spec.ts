import { asBarId, asTableId, DbTableStatus } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TablesRepository } from '../../data-access/tables.repository';
import { GetTablesByBarIdHandler } from './get-tables-by-bar-id.handler';
import { GetTablesByBarIdQuery } from './get-tables-by-bar-id.query';

describe('GetTablesByBarIdHandler', () => {
  let handler: GetTablesByBarIdHandler;
  const repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetTablesByBarIdHandler, { provide: TablesRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetTablesByBarIdHandler>(GetTablesByBarIdHandler);
  });

  it('should return the mapped tables', async () => {
    const barId = asBarId('bar-1');
    const dbTables = [
      {
        id: 'table-1',
        barId: 'bar-1',
        name: 'Mesa 1',
        status: 'FREE',
        createdAt: new Date('2026-05-01T08:00:00Z'),
        updatedAt: new Date('2026-05-01T08:00:00Z'),
      },
    ];
    repository.findByBarId.mockResolvedValue(dbTables);

    const result = await handler.execute(new GetTablesByBarIdQuery(barId));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(asTableId('table-1'));
    expect(result[0].status).toBe(DbTableStatus.FREE);
  });
});
