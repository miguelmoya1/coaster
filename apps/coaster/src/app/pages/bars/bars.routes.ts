import { Routes } from '@angular/router';

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
    ]
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default routes;
