import { Test, TestingModule } from '@nestjs/testing';
import { ShiftDeletedEvent } from '@shifts/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asShiftId, SocketEvents } from '../../../core';
import { BarGateway } from '../../bar.gateway';
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
          provide: BarGateway,
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

  it('should emit SHIFT_DELETED event to the correct bar room', () => {
    const shiftId = asShiftId('shift-1');
    const barId = asBarId('bar-1');
    const event = new ShiftDeletedEvent(barId, shiftId);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.SHIFT_DELETED, { id: shiftId });
  });
});
