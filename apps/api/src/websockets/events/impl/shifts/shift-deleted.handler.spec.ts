import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShiftDeletedHandler } from './shift-deleted.handler';
import { BarGateway } from '../../../bar.gateway';
import { ShiftDeletedEvent } from '../../../../events';
import { asBarId, asShiftId, SocketEvents } from '../../../../core';

describe('ShiftDeletedHandler', () => {
  let handler: ShiftDeletedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
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
