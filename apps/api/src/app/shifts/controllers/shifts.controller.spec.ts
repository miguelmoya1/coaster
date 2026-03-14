import { asBarId, asUserId, ShiftType } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { ShiftsService } from '../services/shifts.service';
import { ShiftsController } from './shifts.controller';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let service: jest.Mocked<ShiftsService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getShifts: jest.fn(),
      createShift: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [{ provide: ShiftsService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<ShiftsController>(ShiftsController);
    service = module.get(ShiftsService);
  });

  it('getShifts debería delegar al servicio con query params', () => {
    service.getShifts.mockResolvedValue([]);

    controller.getShifts(asBarId('bar-1'), '2026-03-01', '2026-03-31');

    expect(service.getShifts).toHaveBeenCalledWith('bar-1', '2026-03-01', '2026-03-31');
  });

  it('createShift debería delegar al servicio', () => {
    service.createShift.mockResolvedValue({} as any);
    const dto = {
      date: '2026-03-20T00:00:00Z',
      type: ShiftType.MORNING,
      userId: asUserId('u1'),
    };

    controller.createShift(asBarId('bar-1'), dto as any);

    expect(service.createShift).toHaveBeenCalledWith('bar-1', dto);
  });
});
