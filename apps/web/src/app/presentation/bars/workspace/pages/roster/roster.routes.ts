import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/bars';

const rosterRoutes: Routes = [
  { path: '', loadComponent: () => import('./roster') },
  {
    path: 'new',
    loadComponent: () => import('./roster'),
    canActivate: [permissionGuard(BarPermission.BAR_CREATE_SHIFT)],
  },
];

export default rosterRoutes;
