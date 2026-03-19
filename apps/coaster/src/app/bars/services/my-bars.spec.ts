import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from '../data-access/bar-repository';
import { MyBars } from './my-bars';

describe('MyBars', () => {
  let service: MyBars;
  let httpMock: HttpTestingController;
  const mockRoutes = { myBars: '/bars' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BarRepository,
          useValue: { routes: mockRoutes },
        },
      ],
    });
    service = TestBed.inject(MyBars);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of bars automatically', () => {
    const mockBars: Bar[] = [{ id: asBarId('bar-1'), name: 'Test Bar' }];

    tick();

    const req = httpMock.expectOne('/bars');
    expect(req.request.method).toBe('GET');
    req.flush(mockBars);

    expect(service.all.value()).toEqual(mockBars);
  });
});
