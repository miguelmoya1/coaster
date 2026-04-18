import {
  asBarId,
  asShiftExchangeId,
  asShiftId,
  asUserId,
  CreateShiftExchangeDto,
  ShiftExchangeStatus,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { ShiftExchangesRepository } from '../data-access/shift-exchanges.repository';
import { ShiftExchangesService } from './shift-exchanges.service';

describe('ShiftExchangesService', () => {
  let service: ShiftExchangesService;
  let repository: Mocked<ShiftExchangesRepository>;

  beforeEach(async () => {
    const mockRepo = {
      getShiftById: vi.fn(),
      getExchangeById: vi.fn(),
      createExchange: vi.fn(),
      findPendingByBarId: vi.fn(),
      acceptExchangeAndSwapShift: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftExchangesService, { provide: ShiftExchangesRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<ShiftExchangesService>(ShiftExchangesService);
    repository = module.get(ShiftExchangesRepository);
  });

  describe('requestExchange', () => {
    const dto: CreateShiftExchangeDto = { targetId: asUserId('target-id') };

    it('debería fallar si el turno no existe', async () => {
      repository.getShiftById.mockResolvedValue(null);

      await expect(
        service.requestExchange(asBarId('bar-1'), asShiftId('shift-1'), asUserId('requester-1'), dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería fallar si el turno es de otro bar', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-FAKE',
        userId: 'requester-1',
      } as any);

      await expect(
        service.requestExchange(asBarId('bar-1'), asShiftId('shift-1'), asUserId('requester-1'), dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.requestExchange(asBarId('bar-1'), asShiftId('shift-1'), asUserId('requester-1'), dto),
      ).rejects.toThrow(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    });

    it('debería fallar si pides el turno de otra persona', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'otro-usuario',
      } as any);

      await expect(
        service.requestExchange(asBarId('bar-1'), asShiftId('shift-1'), asUserId('requester-1'), dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.requestExchange(asBarId('bar-1'), asShiftId('shift-1'), asUserId('requester-1'), dto),
      ).rejects.toThrow(ErrorCodes.NOT_YOUR_SHIFT);
    });

    it('debería crear el intercambio correctamente si todas las reglas validan', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'requester-1',
      } as any);

      repository.createExchange.mockResolvedValue({
        id: 'exchange-1',
      } as any);

      const result = await service.requestExchange(
        asBarId('bar-1'),
        asShiftId('shift-1'),
        asUserId('requester-1'),
        dto,
      );

      expect(repository.createExchange).toHaveBeenCalledWith('shift-1', 'requester-1', 'target-id');
      expect(result).toEqual({ id: 'exchange-1' });
    });
  });

  describe('acceptExchange', () => {
    it('debería fallar si el intercambio no existe', async () => {
      repository.getExchangeById.mockResolvedValue(null);

      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exchange-1'), asUserId('acceptor-1')),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería fallar si el intercambio está aprobado/rechazado', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.APPROVED,
      } as any);

      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('acceptor-1')),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería fallar si intentas aceptar en un bar incorrecto', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        shift: { barId: 'bar-FAR' },
      } as any);

      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('acceptor-1')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería impedir que el solicitante acepte su propio intercambio', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-rafa',
        shift: { barId: 'bar-1' },
      } as any);

      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('user-rafa')),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('user-rafa')),
      ).rejects.toThrow(ErrorCodes.INVALID_EXCHANGE);
    });

    it('debería fallar si hay un targetId explícito y tú no lo eres', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-1',
        targetId: 'user-2', // Se lo ofrece solo al user-2
        shift: { barId: 'bar-1' },
      } as any);

      // user-3 intenta robarlo
      await expect(
        service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('user-3')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería aprobar si todo es correcto y swappear el turno', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-1',
        targetId: null, // Marketplace abierto
        shiftId: 'shift-1',
        shift: { barId: 'bar-1' },
      } as any);

      repository.acceptExchangeAndSwapShift.mockResolvedValue([
        { id: 'exc-1', status: ShiftExchangeStatus.APPROVED },
      ] as any);

      const result = await service.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exc-1'), asUserId('acceptor'));

      expect(repository.acceptExchangeAndSwapShift).toHaveBeenCalledWith('exc-1', 'shift-1', 'acceptor');
      expect(result).toEqual({ id: 'exc-1', status: 'APPROVED' });
    });
  });

  describe('getPendingExchanges', () => {
    it('debería llamar al repositorio', async () => {
      repository.findPendingByBarId.mockResolvedValue([
        {
          id: 'exc-1',
          shiftId: 'shift-1',
          requesterId: 'user-1',
          targetId: null,
          status: ShiftExchangeStatus.PENDING,
          shift: { startTime: new Date('2026-04-17T09:00:00.000Z'), endTime: new Date('2026-04-17T17:00:00.000Z') },
          requester: { id: 'user-1', name: 'John' },
        },
      ] as any);

      const result = await service.getPendingExchanges(asBarId('bar-1'));

      expect(repository.findPendingByBarId).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual([
        {
          id: 'exc-1',
          shiftId: 'shift-1',
          requesterId: 'user-1',
          targetId: undefined,
          status: ShiftExchangeStatus.PENDING,
          requesterName: 'John',
          shiftStartTime: '2026-04-17T09:00:00.000Z',
          shiftEndTime: '2026-04-17T17:00:00.000Z',
        },
      ]);
    });
  });
});
