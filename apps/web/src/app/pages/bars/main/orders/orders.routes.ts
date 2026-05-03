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
    loadComponent: () => import('./new-order/new-order'),
  },
  {
    path: 'new/:tableId',
    loadComponent: () => import('./new-order/new-order'),
  },
  {
    path: ':orderId/add',
    loadComponent: () => import('./new-order/new-order'),
  },
];

export default ordersRoutes;
