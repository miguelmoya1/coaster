import { SocketEvents, asEstablishmentId, asShiftId } from '@coaster/common';
import { ShiftDeletedEvent } from '@coaster/shifts';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentGateway } from '../../establishment.gateway';
import { ShiftDeletedHandler } from './shift-deleted.handler';

describe('ShiftDeletedHandler', () => {
  let handler: ShiftDeletedHandler;

  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftDeletedHandler,
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

    handler = module.get<ShiftDeletedHandler>(ShiftDeletedHandler);
    vi.clearAllMocks();
  });

  it('should emit SHIFT_DELETED event to the correct establishment room', () => {
    const shiftId = asShiftId('shift-1');
    const establishmentId = asEstablishmentId('establishment-1');
    const event = new ShiftDeletedEvent(establishmentId, shiftId);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('establishment-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.shiftDeleted, { id: shiftId });
  });
});
