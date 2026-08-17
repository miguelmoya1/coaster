import { RealtimeEvents, asEstablishmentId, asShiftId } from '@coaster/common';
import { ShiftDeletedEvent } from '@coaster/shifts';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeService } from '../../services';
import { ShiftDeletedHandler } from './shift-deleted.handler';

describe('ShiftDeletedHandler', () => {
  let handler: ShiftDeletedHandler;

  const realtime = { publish: vi.fn(), revoke: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftDeletedHandler, { provide: RealtimeService, useValue: realtime }],
    }).compile();

    handler = module.get<ShiftDeletedHandler>(ShiftDeletedHandler);
    vi.clearAllMocks();
  });

  it('should emit SHIFT_DELETED event to the establishment', () => {
    const shiftId = asShiftId('shift-1');
    const establishmentId = asEstablishmentId('establishment-1');
    const event = new ShiftDeletedEvent(establishmentId, shiftId);
    handler.handle(event);

    expect(realtime.publish).toHaveBeenCalledWith('establishment-1', RealtimeEvents.shiftDeleted, { id: shiftId });
  });
});
