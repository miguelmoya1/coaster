import type { Table } from '@coaster/common';
import { asEstablishmentId, SocketEvents } from '@coaster/common';
import { TableCreatedEvent } from '@coaster/tables';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { TableCreatedHandler } from './table-created.handler';

describe('TableCreatedHandler', () => {
  let handler: TableCreatedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableCreatedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<TableCreatedHandler>(TableCreatedHandler);
  });

  it('should emit TABLE_CREATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const table = { id: 'table-1', name: 'Table 1' } as unknown as Table;
    const event = new TableCreatedEvent(establishmentId, table);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableCreated, table);
  });
});
