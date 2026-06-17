import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShiftCreatedHandler } from './shift-created.handler';
import { BarGateway } from '../../../bar.gateway';
import { ShiftCreatedEvent } from '../../../../events';
import { asBarId, SocketEvents } from '../../../../core';

describe('ShiftCreatedHandler', () => {
  let handler: ShiftCreatedHandler;
  let barGateway: BarGateway;

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
    barGateway = module.get<BarGateway>(BarGateway);
    vi.clearAllMocks();
  });

  it('should emit SHIFT_CREATED event to the correct bar room', () => {
    const shiftData = { id: 'shift-1', barId: 'bar-1' } as any;
    const event = new ShiftCreatedEvent(asBarId('bar-1'), shiftData);
    handler.handle(event);

    expect(mockTo).toHaveBeenCalledWith('bar-1');
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.SHIFT_CREATED, shiftData);
  });
});
