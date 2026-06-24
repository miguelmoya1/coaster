import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asShiftId, ErrorCodes } from '../../../core';
import { ShiftsReadRepository } from '../../data-access/shifts.read.repository';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { ShiftDeletedEvent } from '../../events';
import { DeleteShiftCommand } from '../impl/delete-shift.command';
import { DeleteShiftHandler } from './delete-shift.handler';

describe('DeleteShiftHandler', () => {
  let handler: DeleteShiftHandler;
  let readRepo: ShiftsReadRepository;
  let writeRepo: ShiftsWriteRepository;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteShiftHandler,
        {
          provide: ShiftsReadRepository,
          useValue: {
            findById: vi.fn(),
          },
        },
        {
          provide: ShiftsWriteRepository,
          useValue: {
            delete: vi.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: {
            publish: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<DeleteShiftHandler>(DeleteShiftHandler);
    readRepo = module.get<ShiftsReadRepository>(ShiftsReadRepository);
    writeRepo = module.get<ShiftsWriteRepository>(ShiftsWriteRepository);
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should throw NotFoundException if shift does not exist', async () => {
    const command = new DeleteShiftCommand(asBarId('bar-1'), asShiftId('shift-1'));
    vi.mocked(readRepo.findById).mockResolvedValue(null as any);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND));
  });

  it('should throw NotFoundException if shift belongs to another bar', async () => {
    const command = new DeleteShiftCommand(asBarId('bar-1'), asShiftId('shift-1'));
    vi.mocked(readRepo.findById).mockResolvedValue({ id: 'shift-1', barId: 'bar-2' } as any);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.SHIFT_NOT_FOUND));
  });

  it('should delete shift and publish ShiftDeletedEvent', async () => {
    const command = new DeleteShiftCommand(asBarId('bar-1'), asShiftId('shift-1'));
    vi.mocked(readRepo.findById).mockResolvedValue({ id: 'shift-1', barId: 'bar-1' } as any);

    await handler.execute(command);

    expect(writeRepo.delete).toHaveBeenCalledWith(command.shiftId);
    expect(eventBus.publish).toHaveBeenCalledWith(new ShiftDeletedEvent(command.barId, command.shiftId));
  });
});
