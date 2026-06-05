import type { Table } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableCreatedEvent } from '../../../../events';
import { asBarId, SocketEvents } from '../../../../core';
import { BarGateway } from '../../../bar.gateway';
import { TableCreatedHandler } from './table-created.handler';

describe('TableCreatedHandler', () => {
  let handler: TableCreatedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableCreatedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<TableCreatedHandler>(TableCreatedHandler);
  });

  it('should emit TABLE_CREATED event', () => {
    const barId = asBarId('bar-1');
    const table = { id: 'table-1', name: 'Table 1' } as unknown as Table;
    const event = new TableCreatedEvent(barId, table);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_CREATED, table);
  });
});
