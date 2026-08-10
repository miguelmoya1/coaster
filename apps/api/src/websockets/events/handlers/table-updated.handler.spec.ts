import { SocketEvents, asEstablishmentId, asTableId } from '@coaster/common';
import { DbTableStatus } from '@coaster/core/db';
import { TableUpdatedEvent } from '@coaster/tables';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { TableUpdatedHandler } from './table-updated.handler';

describe('TableUpdatedHandler', () => {
  let handler: TableUpdatedHandler;
  const establishmentGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableUpdatedHandler, { provide: EstablishmentGateway, useValue: establishmentGateway }],
    }).compile();

    handler = module.get<TableUpdatedHandler>(TableUpdatedHandler);
  });

  it('should emit TABLE_UPDATED event', () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const table = {
      id: asTableId('table-1'),
      name: 'Table 1 Updated',
      status: DbTableStatus.FREE,
      establishmentId: asEstablishmentId('establishment-1'),
    };
    const event = new TableUpdatedEvent(establishmentId, table);

    handler.handle(event);

    expect(establishmentGateway.server.to).toHaveBeenCalledWith(establishmentId);
    expect(establishmentGateway.server.emit).toHaveBeenCalledWith(SocketEvents.tableUpdated, table);
  });
});
