import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { firstValueFrom } from 'rxjs';
import { BarRepository } from '../data-access/bar-repository';
import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;
  let httpMock: HttpTestingController;
  const mockRoutes = { bar: (id: string) => `/bars/${id}` };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BarRepository,
          useValue: { routes: mockRoutes },
        },
      ],
    });
    service = TestBed.inject(CurrentBar);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initially have undefined currentBar', () => {
    expect(service.current.value()).toBeUndefined();
  });

  it('should fetch bar when select is called', async () => {
    const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

    service.current.value();
    tick();
    service.select(asBarId('bar-1'));
    service.current.value();
    tick();
    const req = httpMock.expectOne('/bars/bar-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockBar);

    await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.current.value)));
    expect(service.current.value()).toEqual(mockBar);
  });

  it('should clear bar state', async () => {
    service.clear();
    service.current.value();
    tick();
    expect(service.current.value()).toBeUndefined();
  });
});
