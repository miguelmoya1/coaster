import { Routes } from '@angular/router';

const ordersRoutes: Routes = [
  {
    path: '',
    redirectTo: 'tables',
    pathMatch: 'full',
  },
  {
    path: 'tables',
    loadComponent: () => import('./tables/tables'),
  },
  {
    path: 'new',
    loadComponent: () => import('./pos/pos'),
  },
  {
    path: 'new/:tableId',
    loadComponent: () => import('./pos/pos'),
  },
  {
    path: ':orderId/add',
    loadComponent: () => import('./pos/pos'),
  },
];

export default ordersRoutes;
