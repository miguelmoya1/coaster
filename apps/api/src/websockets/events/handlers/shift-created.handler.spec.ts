import { SocketEvents } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftCreatedEvent } from '@shifts/events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { BarGateway } from '../../bar.gateway';
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
          provide: BarGateway,
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

  it('should emit SHIFT_CREATED event to the correct bar room', () => {
    const shiftData = { id: 'shift-1', barId: 'bar-1' } as any;
    const event = new ShiftCreatedEvent(asBarId('bar-1'), shiftData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.shiftCreated, shiftData);
  });
});
