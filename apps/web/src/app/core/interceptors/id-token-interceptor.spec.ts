import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@coaster/env';
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

  it('should add Authorization header on absolute calls to our own API', () => {
    idToken.set('test-token');

    httpClient.get(`${environment.apiUrl}/api/v1/establishments`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/establishments`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should never hand the token to a third party host', () => {
    idToken.set('test-token');

    const storageUrl = 'https://storage.googleapis.com/bucket/establishments/1/products/file.png?X-Goog-Signature=abc';
    httpClient.put(storageUrl, new Blob()).subscribe();

    const req = httpMock.expectOne(storageUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('should not leak the token to the translation files loader', () => {
    idToken.set('test-token');

    httpClient.get('./i18n/es.json').subscribe();

    const req = httpMock.expectOne('./i18n/es.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
