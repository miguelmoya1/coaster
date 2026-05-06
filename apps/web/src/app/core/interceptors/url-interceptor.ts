import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API_VERSION = 'api/v1';

export const urlInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/')) {
    const path = req.url.slice(1);
    const url = `${environment.apiUrl}/${API_VERSION}/${path}`;

    const newReq = req.clone({ url });

    return next(newReq);
  }

  return next(req);
};
