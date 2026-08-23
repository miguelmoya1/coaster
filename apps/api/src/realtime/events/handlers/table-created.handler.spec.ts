import type { Table } from '@coaster/common';
import { asEstablishmentId, RealtimeEvents } from '@coaster/common';
import { TableCreatedEvent } from '@coaster/tables';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { TableCreatedHandler } from './table-created.handler';

describe('TableCreatedHandler', () => {
  let handler: TableCreatedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableCreatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<TableCreatedHandler>(TableCreatedHandler);
  });

  it('should emit TABLE_CREATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const table = { id: 'table-1', name: 'Table 1' } as unknown as Table;
    const event = new TableCreatedEvent(establishmentId, table);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableCreated, table);
  });
});
