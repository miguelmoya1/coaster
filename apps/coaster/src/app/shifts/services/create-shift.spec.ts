import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, CreateShiftDto, Shift, asUserId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ShiftRepository } from '../data-access/shift-repository';
import { CreateShift } from './create-shift';

describe('CreateShift', () => {
  let service: CreateShift;
  let shiftRepoMock: Record<string, Mock>;

  beforeEach(() => {
    shiftRepoMock = {
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CreateShift,
        { provide: ShiftRepository, useValue: shiftRepoMock },
      ],
    });

    service = TestBed.inject(CreateShift);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate shift creation to repository', async () => {
      const barId = asBarId('bar-1');
      const dto: CreateShiftDto = {
        startTime: '2026-03-20T08:00:00Z',
        endTime: '2026-03-20T16:00:00Z',
        userId: asUserId('user-1')
      };
      const mockShift: Shift = {
        id: asShiftId('shift-1'),
        barId,
        ...dto,
        userName: 'User 1',
        userImage: ''
      };

      shiftRepoMock['create'].mockResolvedValue(mockShift);

      const result = await service.execute(barId, dto);

      expect(shiftRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockShift);
    });

    it('should throw error if repository fails', async () => {
      const barId = asBarId('bar-1');
      const dto: CreateShiftDto = {
        startTime: '2026-03-20T08:00:00Z',
        endTime: '2026-03-20T16:00:00Z',
        userId: asUserId('user-1')
      };
      
      const error = new Error('Creation failed');
      shiftRepoMock['create'].mockRejectedValue(error);

      await expect(service.execute(barId, dto)).rejects.toThrow('Creation failed');
    });
  });
});
