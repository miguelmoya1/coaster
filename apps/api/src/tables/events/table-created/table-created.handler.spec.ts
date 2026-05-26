import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableCreatedHandler } from './table-created.handler';
import { TableCreatedEvent } from './table-created.event';
import { BarGateway } from '../../../core';
import { asBarId, SocketEvents } from '@coaster/common';

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
    const table = { id: 'table-1', name: 'Table 1' } as any;
    const event = new TableCreatedEvent(barId, table);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_CREATED, table);
  });
});
