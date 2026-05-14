import { Routes } from '@angular/router';

// poner aqui una pagina que englobe todos para poder setear el bar id y demás... (pensarlo bien)

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
