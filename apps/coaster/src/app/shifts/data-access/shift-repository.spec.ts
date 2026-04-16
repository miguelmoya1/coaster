import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, asShiftId, CreateShiftDto, Shift, asUserId } from '@coaster/interfaces';
import { ShiftRepository } from './shift-repository';

describe('ShiftRepository', () => {
  let service: ShiftRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShiftRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call create shift endpoint', async () => {
    const barId = asBarId('bar-1');
    const dto: CreateShiftDto = { startTime: '2026-03-20T08:00:00Z', endTime: '2026-03-20T16:00:00Z', userId: asUserId('user-1') };
    const mockShift: Shift = { id: asShiftId('shift-1'), barId, ...dto, userName: 'User 1', userImage: 'https://photo.url/u1.jpg' };

    const promise = service.create(barId, dto);

    const req = httpMock.expectOne(service.routes.create(barId));
    expect(req.request.method).toBe('POST');
    req.flush(mockShift);

    const result = await promise;
    expect(result).toEqual(mockShift);
  });
});
