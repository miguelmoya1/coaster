import { RealtimeEvents, asEstablishmentId } from '@coaster/common';
import { ShiftCreatedEvent } from '@coaster/shifts';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ShiftCreatedHandler } from './shift-created.handler';

describe('ShiftCreatedHandler', () => {
  let handler: ShiftCreatedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftCreatedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ShiftCreatedHandler>(ShiftCreatedHandler);
    vi.clearAllMocks();
  });

  it('should emit SHIFT_CREATED event to the establishment', () => {
    const shiftData = { id: 'shift-1', establishmentId: 'establishment-1' } as any;
    const event = new ShiftCreatedEvent(asEstablishmentId('establishment-1'), shiftData);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.shiftCreated, shiftData);
  });
});
