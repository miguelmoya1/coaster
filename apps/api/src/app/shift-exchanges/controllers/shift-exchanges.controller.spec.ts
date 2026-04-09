import { asBarId, asShiftExchangeId, asShiftId, asUserId, User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { ShiftExchangesService } from '../services/shift-exchanges.service';
import { ShiftExchangesController } from './shift-exchanges.controller';

describe('ShiftExchangesController', () => {
  let controller: ShiftExchangesController;
  let service: jest.Mocked<ShiftExchangesService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  const fakeUser = {
    id: asUserId('user-1'),
    email: 'test@mail.com',
    name: 'Test',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    googleId: 'g-123',
  } as any;

  beforeEach(async () => {
    const mockService = {
      getPendingExchanges: jest.fn(),
      requestExchange: jest.fn(),
      acceptExchange: jest.fn(),
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

  it('getExchanges debería delegar al servicio', () => {
    service.getPendingExchanges.mockResolvedValue([]);

    controller.getExchanges(asBarId('bar-1'));

    expect(service.getPendingExchanges).toHaveBeenCalledWith('bar-1');
  });

  it('createExchange debería delegar al servicio con userId del user autenticado', () => {
    service.requestExchange.mockResolvedValue({} as any);
    const dto = { targetId: asUserId('target-1') };

    controller.createExchange(asBarId('bar-1'), asShiftId('shift-1'), dto as any, fakeUser);

    expect(service.requestExchange).toHaveBeenCalledWith('bar-1', 'shift-1', 'user-1', dto);
  });

  it('acceptExchange debería delegar al servicio con userId del user autenticado', () => {
    service.acceptExchange.mockResolvedValue({} as any);

    controller.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), fakeUser);

    expect(service.acceptExchange).toHaveBeenCalledWith('bar-1', 'exc-1', 'user-1');
  });
});
