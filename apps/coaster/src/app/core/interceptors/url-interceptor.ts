import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';

const API_URL = isDevMode()
  ? 'http://localhost:3000'
  : 'https://api.coaster.app';

const API_VERSION = 'api/v1';

export const urlInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/')) {
    const path = req.url.slice(1);
    const url = `${API_URL}/${API_VERSION}/${path}`;

    const newReq = req.clone({ url });

    return next(newReq);
  }

  return next(req);
};
