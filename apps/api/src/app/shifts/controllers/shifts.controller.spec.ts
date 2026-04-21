import { asBarId, asUserId } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { ShiftsService } from '../services/shifts.service';
import { ShiftsController } from './shifts.controller';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let service: Mocked<ShiftsService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getShifts: vi.fn(),
      createShift: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [{ provide: ShiftsService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ShiftsController>(ShiftsController);
    service = module.get(ShiftsService);
  });

  it('getShifts should delegate to the service with query params', () => {
    service.getShifts.mockResolvedValue([]);

    controller.getShifts(asBarId('bar-1'), '2026-03-01', '2026-03-31');

    expect(service.getShifts).toHaveBeenCalledWith('bar-1', '2026-03-01', '2026-03-31');
  });

  it('createShift should delegate to the service', () => {
    service.createShift.mockResolvedValue({});
    const dto = {
      startTime: '2026-03-20T08:00:00Z',
      endTime: '2026-03-20T16:00:00Z',
      userId: asUserId('u1'),
    };

    controller.createShift(asBarId('bar-1'), dto);

    expect(service.createShift).toHaveBeenCalledWith('bar-1', dto);
  });
});
