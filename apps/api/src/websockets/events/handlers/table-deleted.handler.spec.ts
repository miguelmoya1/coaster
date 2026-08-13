import { SocketEvents, asEstablishmentId, asTableId } from '@coaster/common';
import { TableDeletedEvent } from '@coaster/tables';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { TableDeletedHandler } from './table-deleted.handler';

describe('TableDeletedHandler', () => {
  let handler: TableDeletedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableDeletedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<TableDeletedHandler>(TableDeletedHandler);
  });

  it('should emit TABLE_DELETED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const tableId = asTableId('table-1');
    const event = new TableDeletedEvent(establishmentId, tableId);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableDeleted, { id: tableId });
  });
});
