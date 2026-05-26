import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableUpdatedHandler } from './table-updated.handler';
import { TableUpdatedEvent } from './table-updated.event';
import { BarGateway } from '../../../core';
import { asBarId, SocketEvents } from '@coaster/common';

describe('TableUpdatedHandler', () => {
  let handler: TableUpdatedHandler;
  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableUpdatedHandler, { provide: BarGateway, useValue: barGateway }],
    }).compile();

    handler = module.get<TableUpdatedHandler>(TableUpdatedHandler);
  });

  it('should emit TABLE_UPDATED event', () => {
    const barId = asBarId('bar-1');
    const table = { id: 'table-1', name: 'Table 1 Updated' } as any;
    const event = new TableUpdatedEvent(barId, table);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_UPDATED, table);
  });
});
