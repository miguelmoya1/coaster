import { asBarId, asShiftExchangeId, asShiftId, asUserId, User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { ShiftExchangesService } from '../services/shift-exchanges.service';
import { ShiftExchangesController } from './shift-exchanges.controller';

describe('ShiftExchangesController', () => {
  let controller: ShiftExchangesController;
  let service: Mocked<ShiftExchangesService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  const fakeUser = {
    id: asUserId('user-1'),
    email: 'test@mail.com',
    name: 'Test',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    googleId: 'g-123',
  } as User;

  beforeEach(async () => {
    const mockService = {
      getPendingExchanges: vi.fn(),
      requestExchange: vi.fn(),
      acceptExchange: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftExchangesController],
      providers: [{ provide: ShiftExchangesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ShiftExchangesController>(ShiftExchangesController);
    service = module.get(ShiftExchangesService);
  });

  it('getExchanges should delegate to the service', () => {
    service.getPendingExchanges.mockResolvedValue([]);

    controller.getExchanges(asBarId('bar-1'));

    expect(service.getPendingExchanges).toHaveBeenCalledWith('bar-1');
  });

  it("createExchange should delegate to the service with the authenticated user's userId", async () => {
    service.requestExchange.mockResolvedValue({
      id: 'exc-1',
      shiftId: 'shift-1',
      requesterId: 'user-1',
      targetId: 'target-1',
      status: 'PENDING',
      createdAt: new Date(),
      shift: { startTime: new Date(), endTime: new Date() },
      requester: { id: 'user-1', name: 'Test' },
    } as Awaited<ReturnType<typeof ShiftExchangesService.prototype.requestExchange>>);
    const dto = { targetId: asUserId('target-1') };

    await controller.createExchange(asBarId('bar-1'), asShiftId('shift-1'), dto, fakeUser);

    expect(service.requestExchange).toHaveBeenCalledWith('bar-1', 'shift-1', 'user-1', dto);
  });

  it("acceptExchange should delegate to the service with the authenticated user's userId", () => {
    service.acceptExchange.mockResolvedValue(
      {} as Awaited<ReturnType<typeof ShiftExchangesService.prototype.acceptExchange>>,
    );

    controller.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), fakeUser);

    expect(service.acceptExchange).toHaveBeenCalledWith('bar-1', 'exc-1', 'user-1');
  });
});
