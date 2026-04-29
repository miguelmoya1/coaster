import { Routes } from '@angular/router';
import { checkParamIdGuard } from '../../core';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./bars-layout'),
    children: [
      {
        path: 'select',
        loadComponent: () => import('./select-bar/select-bar'),
      },
      {
        path: 'create',
        loadComponent: () => import('./create-bar/create-bar'),
      },
      {
        path: '',
        redirectTo: 'select',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: ':barId',
    canActivate: [checkParamIdGuard('barId')],
    loadChildren: () => import('./main/main.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default routes;
