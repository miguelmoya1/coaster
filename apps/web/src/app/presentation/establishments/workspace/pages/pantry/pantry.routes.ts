import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/establishment-members';

const pantryRoutes: Routes = [
  { path: '', loadComponent: () => import('./pantry') },

  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-templates'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_IMPORT_TEMPLATES)],
  },
];

export default pantryRoutes;
