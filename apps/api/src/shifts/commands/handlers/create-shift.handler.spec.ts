import { asEstablishmentId, asShiftId, asUserId } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftsWriteRepository } from '../../data-access/shifts.write.repository';
import { ShiftCreatedEvent } from '../../events';
import { CreateShiftCommand } from '../impl/create-shift.command';
import { CreateShiftHandler } from './create-shift.handler';

describe('CreateShiftHandler', () => {
  let handler: CreateShiftHandler;
  const repository = {
    create: vi.fn(),
  };
  const security = {
    getEstablishmentMemberRole: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    security.getEstablishmentMemberRole.mockResolvedValue({ role: 'STAFF', active: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShiftHandler,
        { provide: SecurityRepository, useValue: security },
        { provide: ShiftsWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateShiftHandler>(CreateShiftHandler);
  });

  const createDto = {
    startTime: Temporal.Instant.from('2026-03-20T10:00:00.000Z'),
    endTime: Temporal.Instant.from('2026-03-20T18:00:00.000Z'),
    userId: asUserId('user-id'),
    notes: 'Test notes',
  };

  it('should map the created shift correctly', async () => {
    repository.create.mockResolvedValue({
      id: 'shift-1',
      establishmentId: 'establishment-1',
      userId: 'user-id',
      startTime: new Date('2026-03-20T10:00:00.000Z'),
      endTime: new Date('2026-03-20T18:00:00.000Z'),
      notes: 'Test notes',
      user: {
        id: 'user-id',
        name: 'User Name',
        photoUrl: 'https://photo.url/user.jpg',
      },
    });

    await handler.execute(new CreateShiftCommand(asEstablishmentId('establishment-1'), createDto));

    expect(security.getEstablishmentMemberRole).toHaveBeenCalledWith('user-id', 'establishment-1');
    expect(repository.create).toHaveBeenCalledWith('establishment-1', 'user-id', {
      startTime: new Date('2026-03-20T10:00:00.000Z'),
      endTime: new Date('2026-03-20T18:00:00.000Z'),
      notes: 'Test notes',
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new ShiftCreatedEvent(asEstablishmentId('establishment-1'), {
        id: asShiftId('shift-1'),
        startTime: '2026-03-20T10:00:00Z',
        endTime: '2026-03-20T18:00:00Z',
        userId: asUserId('user-id'),
        userName: 'User Name',
        userImage: 'https://photo.url/user.jpg',
        establishmentId: asEstablishmentId('establishment-1'),
        notes: 'Test notes',
      }),
    );
  });

  it('should refuse to schedule somebody who does not work at the establishment', async () => {
    security.getEstablishmentMemberRole.mockResolvedValue(null);

    await expect(
      handler.execute(new CreateShiftCommand(asEstablishmentId('establishment-1'), createDto)),
    ).rejects.toThrow(NotFoundException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should refuse a shift that ends before it starts', async () => {
    const backwards = {
      ...createDto,
      startTime: Temporal.Instant.from('2026-03-20T18:00:00.000Z'),
      endTime: Temporal.Instant.from('2026-03-20T10:00:00.000Z'),
    };

    await expect(
      handler.execute(new CreateShiftCommand(asEstablishmentId('establishment-1'), backwards)),
    ).rejects.toThrow(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should refuse a shift with no duration at all', async () => {
    const instant = { ...createDto, endTime: createDto.startTime };

    await expect(
      handler.execute(new CreateShiftCommand(asEstablishmentId('establishment-1'), instant)),
    ).rejects.toThrow(BadRequestException);
  });
});
