import { RealtimeEvents, asEstablishmentId, asTableId } from '@coaster/common';
import { TableDeletedEvent } from '@coaster/tables';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { TableDeletedHandler } from './table-deleted.handler';

describe('TableDeletedHandler', () => {
  let handler: TableDeletedHandler;
  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableDeletedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<TableDeletedHandler>(TableDeletedHandler);
  });

  it('should emit TABLE_DELETED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const tableId = asTableId('table-1');
    const event = new TableDeletedEvent(establishmentId, tableId);

    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith(establishmentId, RealtimeEvents.tableDeleted, { id: tableId });
  });
});
