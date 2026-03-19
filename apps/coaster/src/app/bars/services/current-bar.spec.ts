import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed, tick } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from '../data-access/bar-repository';
import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;
  let httpMock: HttpTestingController;
  const mockRoutes = { bar: (id: string) => `/bars/${id}` };

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
    expect(service.currentBar.value()).toBeUndefined();
  });

  it('should fetch bar when selectBar is called', () => {
    const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

    tick();
    service.selectBar(asBarId('bar-1'));
    tick();

    const req = httpMock.expectOne('/bars/bar-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockBar);

    expect(service.currentBar.value()).toEqual(mockBar);
  });

  it('should clear bar state', () => {
    service.clearBar();
    tick();
    expect(service.currentBar.value()).toBeUndefined();
  });
});
