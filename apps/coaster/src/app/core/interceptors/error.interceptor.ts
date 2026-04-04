import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError } from '../errors/api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        return throwError(() => new ApiError('NETWORK_ERROR', 0, error));
      }

      let errorCode = 'UNKNOWN_ERROR';

      if (error.error && typeof error.error.message === 'string') {
        errorCode = error.error.message;
      } else if (error.error && Array.isArray(error.error.message)) {
        errorCode = error.error.message[0];
      }

      const cleanError = new ApiError(errorCode, error.status, error);

      return throwError(() => cleanError);
    }),
  );
};
