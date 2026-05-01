import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '../services/auth';
import { idTokenInterceptor } from './id-token-interceptor';

describe('idTokenInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  const idToken = signal<string | undefined>(undefined);

  beforeEach(() => {
    idToken.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([idTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { idToken: idToken.asReadonly() } },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header if token exists', () => {
    idToken.set('test-token');

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add Authorization header if token does not exist', () => {
    idToken.set(undefined);

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
