import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/bar-members';

const staffRoutes: Routes = [
  { path: '', loadComponent: () => import('./staff') },
  {
    path: 'invite',
    loadComponent: () => import('./staff'),
    canActivate: [permissionGuard(BarPermission.BAR_INVITE_MEMBER)],
  },
];

export default staffRoutes;
