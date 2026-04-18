import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../core';
import { BarRepository } from '../data-access/bar-repository';
import { MyBars } from './my-bars';

// TODO: Revisar
describe('MyBars', () => {
  let service: MyBars;
  let httpMock: HttpTestingController;
  const mockRoutes = { myBars: '/bars' };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { isAuthenticated: () => true } },
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

  it('should fetch list of bars automatically', async () => {
    const mockBars: Bar[] = [{ id: asBarId('bar-1'), name: 'Test Bar' }];

    service.all.value();
    tick();
    const req = httpMock.expectOne('/bars');
    expect(req.request.method).toBe('GET');
    req.flush(mockBars);

    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.all.value)));
    expect(service.all.value()).toEqual(mockBars);
  });
});
