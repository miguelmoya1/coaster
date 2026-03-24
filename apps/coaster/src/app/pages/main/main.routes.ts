import { Routes } from '@angular/router';

const mainRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./main'),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard'),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
