import { computed } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard } from '@coaster/admin';
import {
  accountResource,
  accountSessionsResource,
  authGuard,
  noAuthGuard,
  nonBlockingResources,
  queryParam,
  routeParam,
} from '@coaster/core';
import { menuLanguageOf, publishedMenuResource } from '@coaster/menu';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/landing/landing'),
  },
  {
    path: 'm/:slug',
    loadComponent: () => import('./presentation/public-menu/public-menu'),
    resources: nonBlockingResources((context) => {
      const lang = queryParam(context, 'lang');

      return {
        published: publishedMenuResource(
          routeParam(context, 'slug'),
          computed(() => menuLanguageOf(lang())),
        ),
      };
    }),
  },
  {
    path: 'forgot-password',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./presentation/auth/pages/forgot-password/forgot-password'),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./presentation/auth/pages/reset-password/reset-password'),
  },
  {
    path: 'verify-email/:token',
    loadComponent: () => import('./presentation/auth/pages/verify-email/verify-email'),
  },
  {
    path: 'invite/:token',
    loadComponent: () => import('./presentation/auth/pages/invite/invite'),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./presentation/account/account'),
    resources: nonBlockingResources(() => ({
      account: accountResource(),
      sessions: accountSessionsResource(),
    })),
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./presentation/auth/pages/register/register'),
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./presentation/auth/auth.routes'),
  },
  {
    path: 'establishments',
    canActivate: [authGuard],
    loadChildren: () => import('./presentation/establishments/establishments.routes'),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./presentation/admin/admin.routes'),
  },
  {
    path: 'establishment',
    redirectTo: 'establishments',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
