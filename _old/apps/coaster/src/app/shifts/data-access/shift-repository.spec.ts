import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, asUserId, CreateShiftDto, Shift } from '@coaster/common';
import { vi } from 'vitest';
import { ShiftRepository } from './shift-repository';

describe('ShiftRepository', () => {
  let repository: ShiftRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ShiftRepository],
    });
    repository = TestBed.inject(ShiftRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  describe('routes', () => {
    it('should generate correct list route', () => {
      expect(repository.routes.list(asBarId('bar-1'), '2026-01-01', '2026-01-31')).toBe(
        '/bars/bar-1/shifts?startDate=2026-01-01&endDate=2026-01-31',
      );
    });

    it('should generate correct create route', () => {
      expect(repository.routes.create(asBarId('bar-1'))).toBe('/bars/bar-1/shifts');
    });
  });

  describe('create', () => {
    it('should call the create endpoint and return mapped shift', async () => {
      const barId = asBarId('bar-1');
      const dto: CreateShiftDto = {
        startTime: '2026-03-20T08:00:00Z',
        endTime: '2026-03-20T16:00:00Z',
        userId: asUserId('user-1'),
      };
      const mockShift: Shift = {
        id: asShiftId('shift-1'),
        barId,
        ...dto,
        userName: 'User 1',
        userImage: 'https://photo.url/test.jpg',
      };

      const promise = repository.create(barId, dto);

      const req = httpMock.expectOne(repository.routes.create(barId));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockShift);

      const result = await promise;
      expect(result).toEqual(mockShift);
    });
  });
});
