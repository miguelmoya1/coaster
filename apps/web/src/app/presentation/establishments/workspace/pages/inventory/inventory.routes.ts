import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/establishment-members';

const inventoryRoutes: Routes = [
  { path: '', loadComponent: () => import('./inventory') },

  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu-editor'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU)],
  },

  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-catalogue'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_IMPORT_CATALOGUE)],
  },
];

export default inventoryRoutes;
