import { Routes } from '@angular/router';

const ordersRoutes: Routes = [
  {
    path: '',
    redirectTo: 'tables',
    pathMatch: 'full',
  },
  {
    path: 'tables',
    loadComponent: () => import('./tables-view/tables-view'),
  },
  {
    path: 'pos',
    loadComponent: () => import('./pos-view/pos-view'),
  },
];

export default ordersRoutes;
