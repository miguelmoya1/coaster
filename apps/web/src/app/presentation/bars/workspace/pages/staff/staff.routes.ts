import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/core';

const staffRoutes: Routes = [
  { path: '', loadComponent: () => import('./staff') },
  {
    path: 'invite',
    loadComponent: () => import('./staff'),
    canActivate: [permissionGuard(BarPermission.BAR_INVITE_MEMBER)],
  },
];

export default staffRoutes;
