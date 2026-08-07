import type { HttpErrorResponse } from '@angular/common/http';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ErrorCodes } from '@coaster/common';
import type { BarId } from '@coaster/common';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError } from '../errors/api-error';
import { PAYWALL_HANDLER } from '../tokens/paywall-handler.token';
import { Toast } from '../services/toast';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(Toast);
  const paywall = inject(PAYWALL_HANDLER, { optional: true });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        toast.error(ErrorCodes.NETWORK_ERROR);
        return throwError(() => new ApiError(ErrorCodes.NETWORK_ERROR, 0, error));
      }

      let errorCode: string = ErrorCodes.UNEXPECTED_ERROR;

      if (error.error && typeof error.error.message === 'string') {
        errorCode = error.error.message;
      } else if (error.error && Array.isArray(error.error.message)) {
        errorCode = error.error.message[0];
      }

      const cleanError = new ApiError(errorCode, error.status, error);

      if (error.status === 402 || errorCode === ErrorCodes.SUBSCRIPTION_EXPIRED) {
        toast.error(ErrorCodes.SUBSCRIPTION_EXPIRED);
        const barIdMatch = /\/bars\/([^/]+)/.exec(req.url);
        if (barIdMatch?.[1]) {
          paywall?.open(barIdMatch[1] as BarId);
        }
      } else if (error.status !== 401) {
        toast.error(cleanError.code || ErrorCodes.UNEXPECTED_ERROR);
      }

      return throwError(() => cleanError);
    }),
  );
};
