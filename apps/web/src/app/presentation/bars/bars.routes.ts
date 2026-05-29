import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/bars-layout'),
    children: [
      {
        path: 'select',
        loadComponent: () => import('./pages/select-bar/select-bar'),
      },
      {
        path: 'create',
        loadComponent: () => import('./pages/create-bar/create-bar'),
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
    loadChildren: () => import('./workspace/workspace.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default routes;
