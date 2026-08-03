import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlanDialogService } from '@coaster/bars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '../services/toast';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;

  const toastMock = {
    error: vi.fn(),
  };

  const planDialogServiceMock = {
    open: vi.fn(),
  };

  beforeEach(() => {
    toastMock.error.mockReset();
    planDialogServiceMock.open.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Toast, useValue: toastMock },
        { provide: PlanDialogService, useValue: planDialogServiceMock },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call toast.error and planDialogService.open on 402 error', () => {
    httpClient.get('/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(402);
      },
    });

    const req = httpMock.expectOne('/test');
    req.flush({ message: 'SUBSCRIPTION_EXPIRED' }, { status: 402, statusText: 'Payment Required' });

    expect(toastMock.error).toHaveBeenCalledWith('errors.subscription_expired');
    expect(planDialogServiceMock.open).toHaveBeenCalled();
  });
});
