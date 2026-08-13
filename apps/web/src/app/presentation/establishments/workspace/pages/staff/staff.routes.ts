import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/establishment-members';

const staffRoutes: Routes = [
  { path: '', loadComponent: () => import('./staff') },
  {
    path: 'invite',
    loadComponent: () => import('./staff'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER)],
  },
];

export default staffRoutes;
