import { ForbiddenException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asShiftId, asUserId } from '../../../core';
import { ShiftCreatedEvent } from '../../../events';
import { ShiftsReadRepository } from '../../data-access/shifts.read.repository';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { CreateShiftCommand } from './create-shift.command';
import { CreateShiftHandler } from './create-shift.handler';

describe('CreateShiftHandler', () => {
  let handler: CreateShiftHandler;
  const repository = {
    isUserMemberOfBar: vi.fn(),
    create: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShiftHandler,
        { provide: ShiftsWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
        { provide: ShiftsReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<CreateShiftHandler>(CreateShiftHandler);
  });

  const createDto = {
    startTime: Temporal.Instant.from('2026-03-20T10:00:00.000Z'),
    endTime: Temporal.Instant.from('2026-03-20T10:00:00.000Z'),
    userId: asUserId('user-id'),
    notes: 'Test notes',
  };

  it('should map the created shift correctly', async () => {
    repository.isUserMemberOfBar.mockResolvedValue(true);
    repository.create.mockResolvedValue({
      id: 'shift-1',
      barId: 'bar-1',
      userId: 'user-id',
      startTime: new Date('2026-03-20T10:00:00.000Z'),
      endTime: new Date('2026-03-20T10:00:00.000Z'),
      notes: 'Test notes',
      user: {
        id: 'user-id',
        name: 'User Name',
        photoUrl: 'https://photo.url/user.jpg',
      },
    });

    await handler.execute(new CreateShiftCommand(asBarId('bar-1'), createDto));

    expect(repository.isUserMemberOfBar).toHaveBeenCalledWith('user-id', 'bar-1');
    expect(repository.create).toHaveBeenCalledWith('bar-1', 'user-id', {
      startTime: new Date('2026-03-20T10:00:00.000Z'),
      endTime: new Date('2026-03-20T10:00:00.000Z'),
      notes: 'Test notes',
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ShiftCreatedEvent(asBarId('bar-1'), {
        id: asShiftId('shift-1'),
        startTime: '2026-03-20T10:00:00Z',
        endTime: '2026-03-20T10:00:00Z',
        userId: asUserId('user-id'),
        userName: 'User Name',
        userImage: 'https://photo.url/user.jpg',
        barId: asBarId('bar-1'),
        notes: 'Test notes',
      }),
    );
  });

  it('should block creation if user is not a member', async () => {
    repository.isUserMemberOfBar.mockResolvedValue(false);

    await expect(handler.execute(new CreateShiftCommand(asBarId('bar-1'), createDto))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
