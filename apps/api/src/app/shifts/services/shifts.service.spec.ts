import {
  asBarId,
  asUserId,
  CreateShiftDto,
  ShiftType,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsRepository } from '../data-access/shifts.repository';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let repository: jest.Mocked<ShiftsRepository>;

  const VALID_DATE = '2026-03-20T10:00:00.000Z';
  const FAKE_DATE = new Date(VALID_DATE);

  beforeEach(async () => {
    const mockRepo = {
      isUserMemberOfBar: jest.fn(),
      create: jest.fn(),
      findByBarId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: ShiftsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    repository = module.get(ShiftsRepository);
  });

  describe('createShift', () => {
    const createDto: CreateShiftDto = {
      date: VALID_DATE,
      type: ShiftType.NIGHT,
      userId: asUserId('user-id'),
      notes: 'Test notes',
    };

    it('debería mapear correctamente un turno creado', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(true);
      repository.create.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'user-id',
        date: FAKE_DATE,
        type: 'NIGHT',
        notes: 'Test notes',
        user: { id: 'user-id', name: 'User Name' },
      } as any);

      const result = await service.createShift(asBarId('bar-1'), createDto);

      expect(repository.isUserMemberOfBar).toHaveBeenCalledWith(
        'user-id',
        'bar-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        'bar-1',
        'user-id',
        { date: FAKE_DATE, type: ShiftType.NIGHT, notes: 'Test notes' },
      );

      expect(result).toEqual({
        id: 'shift-1',
        date: '2026-03-20', // ISO YYYY-MM-DD
        type: ShiftType.NIGHT,
        userId: 'user-id',
        barId: 'bar-1',
        notes: 'Test notes',
        user: { id: 'user-id', name: 'User Name', email: '', active: true },
      });
    });

    it('debería bloquear creación si el usuario no es miembro', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(false);

      await expect(
        service.createShift(asBarId('bar-1'), createDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createShift(asBarId('bar-1'), createDto),
      ).rejects.toThrow(ErrorCodes.MEMBER_NOT_FOUND);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si la fecha es inválida', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(true);

      const invalidDto: CreateShiftDto = {
        ...createDto,
        date: 'fecha-invalida',
      };

      await expect(
        service.createShift(asBarId('bar-1'), invalidDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createShift(asBarId('bar-1'), invalidDto),
      ).rejects.toThrow(ErrorCodes.INVALID_DATE);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('getShifts', () => {
    it('debería mapear correctamente un listado de turnos y filtrar por fecha', async () => {
      repository.findByBarId.mockResolvedValue([
        {
          id: 'shift-1',
          barId: 'bar-1',
          userId: 'user-id',
          date: FAKE_DATE,
          type: 'NIGHT',
          notes: null,
          user: null,
        } as any,
      ]);

      const startIso = '2026-03-01T00:00:00Z';
      const endIso = '2026-03-31T23:59:59Z';

      const result = await service.getShifts(
        asBarId('bar-1'),
        startIso,
        endIso,
      );

      expect(repository.findByBarId).toHaveBeenCalledWith(
        'bar-1',
        new Date(startIso),
        new Date(endIso),
      );

      expect(result).toEqual([
        {
          id: 'shift-1',
          date: '2026-03-20',
          type: ShiftType.NIGHT,
          userId: 'user-id',
          barId: 'bar-1',
          notes: undefined,
          user: undefined,
        },
      ]);
    });

    it('debería lanzar error si un query param datetime es inválido', async () => {
      await expect(
        service.getShifts(asBarId('bar-1'), 'invalida', '2026-01-01T00:00:00Z'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getShifts(asBarId('bar-1'), undefined, 'invalida'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
