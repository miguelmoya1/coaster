import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { FIREBASE_AUTH } from './core';
import { provideRouter, withComponentInputBinding, withRouterConfig, withViewTransitions } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { errorInterceptor, idTokenInterceptor, unauthorizedInterceptor, urlInterceptor } from './core';

export const appConfig: ApplicationConfig = {
  providers: [
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
