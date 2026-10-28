import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorCodes } from '../errors/error.types';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';
import { Toast } from '../services/toast';

const isAuthCall = (url: string) => url.includes('/auth/');

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(Auth);
  const toast = inject(Toast);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthCall(req.url)) {
        return throwError(() => error);
      }

      const sentAuthorization = req.headers.get('Authorization');
      const currentToken = auth.accessToken?.() ?? null;

      if (sentAuthorization && currentToken && sentAuthorization !== `Bearer ${currentToken}`) {
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${currentToken}` } }));
      }

      return from(auth.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            toast.error(ErrorCodes.SESSION_EXPIRED);
            router.navigate(['/login'], { replaceUrl: true });

            return throwError(() => error);
          }

          return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
        }),
      );
    }),
  );
};
