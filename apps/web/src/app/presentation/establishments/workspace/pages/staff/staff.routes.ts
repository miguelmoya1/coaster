import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources } from '@coaster/core';
import { membersResource, permissionGuard } from '@coaster/establishment-members';

const staffResources = nonBlockingResources((context) => ({
  members: membersResource(establishmentIdOf(context)),
}));

const staffRoutes: Routes = [
  { path: '', loadComponent: () => import('./staff'), resources: staffResources },
  {
    path: 'invite',
    loadComponent: () => import('./staff'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER)],
    resources: staffResources,
  },
];

export default staffRoutes;
