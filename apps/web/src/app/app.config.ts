import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  Injector,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig, withViewTransitions } from '@angular/router';
import type { EstablishmentId } from '@coaster/common';
import type { PaywallHandler } from '@coaster/core';
import {
  errorInterceptor,
  accessTokenInterceptor,
  PAYWALL_HANDLER,
  unauthorizedInterceptor,
  urlInterceptor,
  VirtualKeyboard,
  AppUpdate,
} from '@coaster/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: PAYWALL_HANDLER,
      useFactory: (injector: Injector): PaywallHandler => ({
        open: (establishmentId: EstablishmentId) => {
          void import('@coaster/establishment-subscription').then(({ BillingEntryPoint }) =>
            injector.get(BillingEntryPoint).open(establishmentId),
          );
        },
      }),
      deps: [Injector],
    },
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(VirtualKeyboard).watch()),
    provideAppInitializer(() => inject(AppUpdate).watch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideZonelessChangeDetection(),
    provideHttpClient(
      withInterceptors([urlInterceptor, accessTokenInterceptor, errorInterceptor, unauthorizedInterceptor]),
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
  ],
};
