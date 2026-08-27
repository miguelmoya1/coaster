import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@coaster/env';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../services/auth';

const ours = (url: string) => url.startsWith('/') || url.startsWith(environment.apiUrl);

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(Auth);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && ours(req.url)) {
        auth.logout();
        router.navigate(['/login'], { replaceUrl: true });
      }
      return throwError(() => error);
    }),
  );
};
