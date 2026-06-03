import type { Table } from '@coaster/common';
import { asBarId, asTableId } from '../../../core';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TablesRepository } from '../../data-access/tables.repository';
import { TableCreatedEvent } from '../../events';
import { CreateTableCommand } from './create-table.command';
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
        { provide: TablesRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateTableHandler>(CreateTableHandler);
  });

  it('should create the table and publish event', async () => {
    const barId = asBarId('bar-1');
    const dto = { name: 'Mesa 1' };
    const dbTable = {
      id: 'table-1',
      barId: 'bar-1',
      name: 'Mesa 1',
      status: 'FREE',
      createdAt: new Date('2026-05-01T08:00:00Z'),
      updatedAt: new Date('2026-05-01T08:00:00Z'),
    };
    repository.create.mockResolvedValue(dbTable);

    const result = await handler.execute(new CreateTableCommand(barId, dto));

    expect(repository.create).toHaveBeenCalledWith(barId, { name: 'Mesa 1' });
    expect(eventBus.publish).toHaveBeenCalledWith(new TableCreatedEvent(barId, expect.any(Object) as unknown as Table));
    expect(result).toEqual({ id: asTableId('table-1') });
  });
});
