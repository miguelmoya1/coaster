import { Routes } from '@angular/router';

const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./login'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

export default authRoutes;
