import { asBarId, asTableId, SocketEvents } from '../../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../../core';
import { TableDeletedEvent } from './table-deleted.event';
import { TableDeletedHandler } from './table-deleted.handler';

describe('TableDeletedHandler', () => {
  let handler: TableDeletedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableDeletedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<TableDeletedHandler>(TableDeletedHandler);
  });

  it('should emit TABLE_DELETED event', () => {
    const barId = asBarId('bar-1');
    const tableId = asTableId('table-1');
    const event = new TableDeletedEvent(barId, tableId);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_DELETED, { id: tableId });
  });
});
