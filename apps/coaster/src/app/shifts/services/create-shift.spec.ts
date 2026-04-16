import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, CreateShiftDto, Shift, asUserId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ShiftRepository } from '../data-access/shift-repository';
import { BarShifts } from './bar-shifts';
import { CreateShift } from './create-shift';

describe('CreateShift', () => {
  let service: CreateShift;
  let shiftRepoMock: Record<string, Mock>;
  let barShiftsMock: Record<string, Mock>;

  beforeEach(() => {
    shiftRepoMock = {
      create: vi.fn(),
    };

    barShiftsMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CreateShift,
        { provide: ShiftRepository, useValue: shiftRepoMock },
        { provide: BarShifts, useValue: barShiftsMock },
      ],
    });

    service = TestBed.inject(CreateShift);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a shift and reload bar shifts', async () => {
    const barId = asBarId('bar-1');
    const dto: CreateShiftDto = { startTime: '2026-03-20T08:00:00Z', endTime: '2026-03-20T16:00:00Z', userId: asUserId('user-1') };
    const mockShift: Shift = { id: asShiftId('shift-1'), barId, ...dto, userName: 'User 1', userImage: 'https://photo.url/u1.jpg' };

    shiftRepoMock['create'].mockResolvedValue(mockShift);

    const result = await service.execute(barId, dto);

    expect(shiftRepoMock['create']).toHaveBeenCalledWith(barId, dto);

    expect(result).toEqual(mockShift);
  });
});
