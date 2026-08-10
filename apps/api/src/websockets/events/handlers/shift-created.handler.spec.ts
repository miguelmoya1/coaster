import { SocketEvents, asEstablishmentId } from '@coaster/common';
import { ShiftCreatedEvent } from '@coaster/shifts';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { ShiftCreatedHandler } from './shift-created.handler';

describe('ShiftCreatedHandler', () => {
  let handler: ShiftCreatedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftCreatedHandler,
        {
          provide: EstablishmentGateway,
          useValue: {
            server: {
              to: mockTo,
            },
          },
        },
      ],
    }).compile();

    handler = module.get<ShiftCreatedHandler>(ShiftCreatedHandler);
    vi.clearAllMocks();
  });

  it('should emit SHIFT_CREATED event to the correct establishment room', () => {
    const shiftData = { id: 'shift-1', establishmentId: 'establishment-1' } as any;
    const event = new ShiftCreatedEvent(asEstablishmentId('establishment-1'), shiftData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.shiftCreated, shiftData);
  });
});
