import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/core';
import { permissionGuard } from '@coaster/core';

const rosterRoutes: Routes = [
  { path: '', loadComponent: () => import('./roster') },
  {
    path: 'new',
    loadComponent: () => import('./roster'),
    canActivate: [permissionGuard(BarPermission.CREATE_SHIFT)],
  },
];

export default rosterRoutes;
