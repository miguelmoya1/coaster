import { TableStatus, asEstablishmentId, asTableId } from '@coaster/common';
import { DbTableStatus } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { GetTablesByEstablishmentIdQuery } from '../impl/get-tables-by-establishment-id.query';
import { GetTablesByEstablishmentIdHandler } from './get-tables-by-establishment-id.handler';

describe('GetTablesByEstablishmentIdHandler', () => {
  let handler: GetTablesByEstablishmentIdHandler;
  const repository = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetTablesByEstablishmentIdHandler, { provide: TablesReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetTablesByEstablishmentIdHandler>(GetTablesByEstablishmentIdHandler);
  });

  it('should return the mapped tables', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dbTables = [
      {
        id: 'table-1',
        establishmentId: 'establishment-1',
        name: 'Mesa 1',
        status: TableStatus.FREE,
        createdAt: new Date('2026-05-01T08:00:00Z'),
        updatedAt: new Date('2026-05-01T08:00:00Z'),
      },
    ];
    repository.findByEstablishmentId.mockResolvedValue(dbTables);

    const result = await handler.execute(new GetTablesByEstablishmentIdQuery(establishmentId));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(asTableId('table-1'));
    expect(result[0].status).toBe(DbTableStatus.FREE);
  });
});
