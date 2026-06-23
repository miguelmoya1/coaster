import { Test, TestingModule } from '@nestjs/testing';
import { TableUpdatedEvent } from '@tables/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asTableId, SocketEvents } from '../../../../core';
import { DbTableStatus } from '../../../../core/db';
import { BarGateway } from '../../../bar.gateway';
import { TableUpdatedHandler } from './table-updated.handler';

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
    const table = {
      id: asTableId('table-1'),
      name: 'Table 1 Updated',
      status: DbTableStatus.FREE,
      barId: asBarId('bar-1'),
    };
    const event = new TableUpdatedEvent(barId, table);

    handler.handle(event);

    expect(barGateway.server.to).toHaveBeenCalledWith(barId);
    expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.TABLE_UPDATED, table);
  });
});
