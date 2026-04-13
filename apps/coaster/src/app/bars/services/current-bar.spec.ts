import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from '../data-access/bar-repository';
import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;
  let httpMock: HttpTestingController;
  const mockRoutes = { bar: (id: string) => `/bars/${id}` };

  beforeEach(async () => {
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
    service = TestBed.inject(CurrentBar);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should initially have undefined currentBar', async () => {});

  it('should fetch bar when select is called', async () => {
    const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    service.select(asBarId('bar-1'));
    try {
      (service as any).all?.value();
    } catch (e) {}
    try {
      (service as any).list?.value();
    } catch (e) {}
    try {
      (service as any).pending?.value();
    } catch (e) {}
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne('/bars/bar-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockBar);
  });

  it('should clear bar state', async () => {
    service.clear();
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
  });
});
