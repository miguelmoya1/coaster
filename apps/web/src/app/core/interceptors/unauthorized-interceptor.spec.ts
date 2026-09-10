import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from '../services/auth';
import { unauthorizedInterceptor } from './unauthorized-interceptor';

describe('unauthorizedInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const authMock = { refresh: vi.fn() };
  const routerMock = { navigate: vi.fn() };

  beforeEach(() => {
    authMock.refresh.mockReset();
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

  it('should refresh the session and replay the request that came back 401', async () => {
    authMock.refresh.mockResolvedValue('a-fresh-token');

    const response = firstResponse(httpClient);

    httpMock.expectOne('/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await Promise.resolve();

    const replay = httpMock.expectOne('/test');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer a-fresh-token');

    replay.flush({ ok: true });

    await expect(response).resolves.toEqual({ ok: true });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should send the user to the login page when the session cannot be refreshed', async () => {
    authMock.refresh.mockResolvedValue(null);

    const failure = failureOf(firstResponse(httpClient));

    httpMock.expectOne('/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect((await failure).status).toBe(401);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should not try to refresh when the call that failed was the refresh itself', async () => {
    const failure = failureOf(
      new Promise((resolve, reject) => {
        httpClient.post('/auth/refresh', {}).subscribe({ next: resolve, error: reject });
      }),
    );

    httpMock.expectOne('/auth/refresh').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect((await failure).status).toBe(401);
    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should leave errors that are not 401 alone', async () => {
    const failure = failureOf(firstResponse(httpClient));

    httpMock.expectOne('/test').flush('Bad Request', { status: 400, statusText: 'Bad Request' });

    expect((await failure).status).toBe(400);
    expect(authMock.refresh).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});

function firstResponse(httpClient: HttpClient): Promise<unknown> {
  return new Promise((resolve, reject) => {
    httpClient.get('/test').subscribe({ next: resolve, error: reject });
  });
}

function failureOf(call: Promise<unknown>): Promise<HttpErrorResponse> {
  return call.then(
    () => {
      throw new Error('expected the request to fail');
    },
    (error: HttpErrorResponse) => error,
  );
}
