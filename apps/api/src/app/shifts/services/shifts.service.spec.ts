import { asBarId, asUserId, CreateShiftDto } from '@coaster/interfaces';
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
      providers: [ShiftsService, { provide: ShiftsRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    repository = module.get(ShiftsRepository);
  });

  describe('createShift', () => {
    const createDto: CreateShiftDto = {
      startTime: VALID_DATE,
      endTime: VALID_DATE,
      userId: asUserId('user-id'),
      notes: 'Test notes',
    };

    it('debería mapear correctamente un turno creado', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(true);
      repository.create.mockResolvedValue({
        id: 'shift-1',
        barId: 'bar-1',
        userId: 'user-id',
        startTime: FAKE_DATE,
        endTime: FAKE_DATE,
        notes: 'Test notes',
        user: { id: 'user-id', name: 'User Name', photoUrl: 'https://photo.url/user.jpg' },
      } as any);

      const result = await service.createShift(asBarId('bar-1'), createDto);

      expect(repository.isUserMemberOfBar).toHaveBeenCalledWith('user-id', 'bar-1');
      expect(repository.create).toHaveBeenCalledWith('bar-1', 'user-id', {
        startTime: FAKE_DATE,
        endTime: FAKE_DATE,
        notes: 'Test notes',
      });

      expect(result).toEqual({
        id: 'shift-1',
        startTime: '2026-03-20T10:00:00.000Z',
        endTime: '2026-03-20T10:00:00.000Z',
        userId: 'user-id',
        userName: 'User Name',
        userImage: 'https://photo.url/user.jpg',
        barId: 'bar-1',
        notes: 'Test notes',
      });
    });

    it('debería bloquear creación si el usuario no es miembro', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(false);

      await expect(service.createShift(asBarId('bar-1'), createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.createShift(asBarId('bar-1'), createDto)).rejects.toThrow(ErrorCodes.MEMBER_NOT_FOUND);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si la fecha es inválida', async () => {
      repository.isUserMemberOfBar.mockResolvedValue(true);

      const invalidDto: CreateShiftDto = {
        ...createDto,
        startTime: 'fecha-invalida',
      };

      await expect(service.createShift(asBarId('bar-1'), invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.createShift(asBarId('bar-1'), invalidDto)).rejects.toThrow(ErrorCodes.INVALID_DATE);

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
          startTime: FAKE_DATE,
          endTime: FAKE_DATE,
          notes: null,
          user: null,
        } as any,
      ]);

      const startIso = '2026-03-01T00:00:00Z';
      const endIso = '2026-03-31T23:59:59Z';

      const result = await service.getShifts(asBarId('bar-1'), startIso, endIso);

      expect(repository.findByBarId).toHaveBeenCalledWith('bar-1', new Date(startIso), new Date(endIso));

      expect(result).toEqual([
        {
          id: 'shift-1',
          startTime: '2026-03-20T10:00:00.000Z',
          endTime: '2026-03-20T10:00:00.000Z',
          userId: 'user-id',
          userName: '',
          userImage: undefined,
          barId: 'bar-1',
          notes: undefined,
        },
      ]);
    });

    it('debería lanzar error si un query param datetime es inválido', async () => {
      await expect(service.getShifts(asBarId('bar-1'), 'invalida', '2026-01-01T00:00:00Z')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.getShifts(asBarId('bar-1'), undefined, 'invalida')).rejects.toThrow(BadRequestException);
    });
  });
});
