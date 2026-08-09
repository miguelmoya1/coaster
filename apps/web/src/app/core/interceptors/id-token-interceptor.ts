import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@coaster/env';
import { Auth } from '../services/auth';

export const idTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);

  const token = authService.idToken();

  const goesToOurApi = req.url.startsWith('/') || req.url.startsWith(environment.apiUrl);

  if (token && goesToOurApi) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
