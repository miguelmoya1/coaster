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
    path: 'history',
    loadComponent: () => import('./history/history'),
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
  {
    path: ':orderId',
    loadComponent: () => import('./order-detail/order-detail'),
  },
];

export default ordersRoutes;
