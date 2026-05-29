import { Routes } from '@angular/router';

const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default authRoutes;
