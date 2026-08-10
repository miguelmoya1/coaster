import type { Table } from '@coaster/common';
import { asEstablishmentId, TableStatus } from '@coaster/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TablesWriteRepository } from '../../data-access/tables.write.repository';
import { TableCreatedEvent } from '../../events';
import { CreateTableCommand } from '../impl/create-table.command';
import { CreateTableHandler } from './create-table.handler';

describe('CreateTableHandler', () => {
  let handler: CreateTableHandler;
  const repository = {
    create: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTableHandler,
        { provide: TablesWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateTableHandler>(CreateTableHandler);
  });

  it('should create the table and publish event', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const dto = { name: 'Mesa 1' };
    const dbTable = {
      id: 'table-1',
      establishmentId: 'establishment-1',
      name: 'Mesa 1',
      status: TableStatus.FREE,
      createdAt: new Date('2026-05-01T08:00:00Z'),
      updatedAt: new Date('2026-05-01T08:00:00Z'),
    };
    repository.create.mockResolvedValue(dbTable);

    await handler.execute(new CreateTableCommand(establishmentId, dto));

    expect(repository.create).toHaveBeenCalledWith(establishmentId, { name: 'Mesa 1' });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new TableCreatedEvent(establishmentId, expect.any(Object) as unknown as Table),
    );
  });
});
