import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/establishments-layout'),
    children: [
      {
        path: 'select',
        loadComponent: () => import('./pages/select-establishment/select-establishment'),
      },
      {
        path: 'create',
        loadComponent: () => import('./pages/create-establishment/create-establishment'),
      },
      {
        path: '',
        redirectTo: 'select',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: ':establishmentId',
    loadChildren: () => import('./workspace/workspace.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default routes;
