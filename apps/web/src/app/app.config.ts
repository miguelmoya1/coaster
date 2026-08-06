import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter, withComponentInputBinding, withRouterConfig, withViewTransitions } from '@angular/router';
import { PlanDialogService } from '@coaster/bar-subscription';
import {
  errorInterceptor,
  FIREBASE_AUTH,
  idTokenInterceptor,
  PAYWALL_HANDLER,
  unauthorizedInterceptor,
  urlInterceptor,
} from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: PAYWALL_HANDLER, useExisting: PlanDialogService },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideNativeDateAdapter(),
    provideHttpClient(
      withInterceptors([urlInterceptor, idTokenInterceptor, errorInterceptor, unauthorizedInterceptor]),
    ),
    provideRouter(
      appRoutes,
      withViewTransitions(),
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideTranslateService({
      lang: environment.defaultLanguage,
      loader: provideTranslateHttpLoader({
        prefix: environment.defaultLanguagePath,
      }),
    }),
    {
      provide: FIREBASE_AUTH,
      useFactory: () => {
        const app = initializeApp({
          apiKey: environment.firebase.apiKey,
          authDomain: environment.firebase.authDomain,
          projectId: environment.firebase.projectId,
          storageBucket: environment.firebase.storageBucket,
          messagingSenderId: environment.firebase.messagingSenderId,
          appId: environment.firebase.appId,
        });
        const auth = getAuth(app);

        if (environment.useEmulators) {
          connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        }

        return auth;
      },
    },
  ],
};
