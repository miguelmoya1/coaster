import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from './bar-repository';

describe('BarRepository', () => {
  let service: BarRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BarRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call create bar endpoint', async () => {
    const mockBar: Bar = { id: asBarId('1'), name: 'Test Bar' };
    const promise = service.create({ name: 'Test Bar' });

    const req = httpMock.expectOne(service.routes.create);
    expect(req.request.method).toBe('POST');
    req.flush(mockBar);

    const result = await promise;
    expect(result).toEqual(mockBar);
  });
});
