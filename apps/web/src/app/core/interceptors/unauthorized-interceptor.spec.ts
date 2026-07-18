import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';
import { unauthorizedInterceptor } from './unauthorized-interceptor';

describe('unauthorizedInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const authMock = {
    logout: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(() => {
    authMock.logout.mockReset();
    routerMock.navigate.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should redirect to /login and call logout on 401 response', () => {
    httpClient.get('/test').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should not redirect or call logout on non-401 errors', () => {
    httpClient.get('/test').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(400);
      },
    });

    const req = httpMock.expectOne('/test');
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

    expect(authMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
