import { Auth } from '../../core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from '../data-access/bar-repository';
import { MyBars } from './my-bars';

describe('MyBars', () => {
  let service: MyBars;
  let httpMock: HttpTestingController;
  const mockRoutes = { myBars: '/bars' };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
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

  it('should be created', async () => {
    expect(service).toBeTruthy();
  });

  it('should fetch list of bars automatically', async () => {
    const mockBars: Bar[] = [{ id: asBarId('bar-1'), name: 'Test Bar' }];

    try {
      service.all.value();
    } catch {
      /* ignore */
    }
    TestBed.flushEffects();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne('/bars');
    expect(req.request.method).toBe('GET');
    req.flush(mockBars);
  });
});
