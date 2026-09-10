import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';

const isAuthCall = (url: string) => url.includes('/auth/');

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(Auth);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthCall(req.url)) {
        return throwError(() => error);
      }

      return from(auth.refresh()).pipe(
        switchMap((token) => {
          if (!token) {
            router.navigate(['/login'], { replaceUrl: true });

            return throwError(() => error);
          }

          return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
        }),
      );
    }),
  );
};
