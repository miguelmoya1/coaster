import {
  asBarId,
  asShiftExchangeId,
  asShiftId,
  asUserId,
  CreateShiftExchangeDto,
  ErrorCodes,
  ShiftExchangeStatus,
} from '@coaster/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { Shift } from '../../core';
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
      hasPendingExchangeForShift: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftExchangesService,
        { provide: ShiftExchangesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ShiftExchangesService>(ShiftExchangesService);
    repository = module.get(ShiftExchangesRepository);
  });

  describe('requestExchange', () => {
    const dto: CreateShiftExchangeDto = { targetId: asUserId('target-id') };

    it('should fail if the shift does not exist', async () => {
      repository.getShiftById.mockResolvedValue(null);

      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail if the shift belongs to another bar', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-FAKE',
        userId: 'requester-1',
        createdAt: new Date(),
        endTime: new Date(),
        notes: '',
        startTime: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(ErrorCodes.UNAUTHORIZED_SHIFT_ACTION);
    });

    it("should fail if requesting someone else's shift", async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'otro-usuario',
        createdAt: new Date(),
        endTime: new Date(),
        notes: '',
        startTime: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(ErrorCodes.NOT_YOUR_SHIFT);
    });

    it('should fail if the shift already has a pending exchange', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'requester-1',
        createdAt: new Date(),
        endTime: new Date(),
        notes: '',
        startTime: new Date(),
        updatedAt: new Date(),
      });

      repository.hasPendingExchangeForShift.mockResolvedValue(true);

      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestExchange(
          asBarId('bar-1'),
          asShiftId('shift-1'),
          asUserId('requester-1'),
          dto,
        ),
      ).rejects.toThrow(ErrorCodes.EXCHANGE_ALREADY_PENDING);
    });

    it('should create the exchange correctly if all rules validate', async () => {
      repository.getShiftById.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'requester-1',
        createdAt: new Date(),
        endTime: new Date(),
        notes: '',
        startTime: new Date(),
        updatedAt: new Date(),
      });

      repository.hasPendingExchangeForShift.mockResolvedValue(false);

      repository.createExchange.mockResolvedValue({
        id: 'exchange-1',
        createdAt: new Date(),
        shiftId: 'shift-1',
        requesterId: 'requester-1',
        targetId: 'target-id',
        status: ShiftExchangeStatus.PENDING,
      });

      const result = await service.requestExchange(
        asBarId('bar-1'),
        asShiftId('shift-1'),
        asUserId('requester-1'),
        dto,
      );

      expect(repository.createExchange).toHaveBeenCalledWith(
        'shift-1',
        'requester-1',
        'target-id',
      );
      expect(result).toMatchObject({
        id: 'exchange-1',
        requesterId: 'requester-1',
        shiftId: 'shift-1',
        status: 'PENDING',
        targetId: 'target-id',
      });
    });
  });

  describe('acceptExchange', () => {
    it('should fail if the exchange does not exist', async () => {
      repository.getExchangeById.mockResolvedValue(null);

      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exchange-1'),
          asUserId('acceptor-1'),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail if the exchange is approved/rejected', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.APPROVED,
        createdAt: new Date(),
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        shift: {} as unknown as Shift,
      });

      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exc-1'),
          asUserId('acceptor-1'),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail if attempting to accept in the wrong bar', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        createdAt: new Date(),
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: 'user-2',
        shift: { barId: 'bar-FAR' } as unknown as Shift,
      });

      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exc-1'),
          asUserId('acceptor-1'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent the requester from accepting their own exchange', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-rafa',
        shift: { barId: 'bar-1' } as unknown as Shift,
        createdAt: new Date(),
        shiftId: 'shift-1',
        targetId: 'user-2',
      });

      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exc-1'),
          asUserId('user-rafa'),
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exc-1'),
          asUserId('user-rafa'),
        ),
      ).rejects.toThrow(ErrorCodes.INVALID_EXCHANGE);
    });

    it('should fail if there is an explicit targetId and it is not you', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-1',
        targetId: 'user-2',
        shift: { barId: 'bar-1' } as unknown as Shift,
        createdAt: new Date(),
        shiftId: 'shift-1',
      });

      await expect(
        service.acceptExchange(
          asBarId('bar-1'),
          asShiftExchangeId('exc-1'),
          asUserId('user-3'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should approve if everything is correct and swap the shift', async () => {
      repository.getExchangeById.mockResolvedValue({
        id: 'exc-1',
        status: ShiftExchangeStatus.PENDING,
        requesterId: 'user-1',
        targetId: null,
        shiftId: 'shift-1',
        createdAt: new Date(),
        shift: { barId: 'bar-1' } as unknown as Shift,
      });

      repository.acceptExchangeAndSwapShift.mockResolvedValue([
        {
          id: 'exc-1',
          status: ShiftExchangeStatus.APPROVED,
          shiftId: 'shift-1',
          requesterId: 'user-1',
          targetId: null,
          createdAt: new Date(),
          shift: { barId: 'bar-1' } as unknown as Shift,
        },
        {
          id: 'shift-2',
          barId: 'bar-1',
          userId: 'user-1',
          startTime: new Date(),
          endTime: new Date(),
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.acceptExchange(
        asBarId('bar-1'),
        asShiftExchangeId('exc-1'),
        asUserId('acceptor'),
      );

      expect(repository.acceptExchangeAndSwapShift).toHaveBeenCalledWith(
        'exc-1',
        'shift-1',
        'acceptor',
      );
      expect(result).toMatchObject({ id: 'exc-1', status: 'APPROVED' });
    });
  });

  describe('getPendingExchanges', () => {
    it('should call the repository', async () => {
      repository.findPendingByBarId.mockResolvedValue([
        {
          id: 'exc-1',
          shiftId: 'shift-1',
          requesterId: 'user-1',
          targetId: null,
          status: ShiftExchangeStatus.PENDING,
          shift: {
            startTime: new Date('2026-04-17T09:00:00.000Z'),
            endTime: new Date('2026-04-17T17:00:00.000Z'),
            createdAt: new Date(),
            updatedAt: new Date(),
            notes: '',
            barId: 'bar-1',
            userId: 'user-1',
          } as unknown as Shift,
          createdAt: new Date(),
          requester: { id: 'user-1', name: 'John' },
        },
      ]);

      const result = await service.getPendingExchanges(asBarId('bar-1'));

      expect(repository.findPendingByBarId).toHaveBeenCalledWith('bar-1');
      expect(result).toMatchObject([
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
