import { Routes } from '@angular/router';
import { starterCatalogueResource } from '@coaster/catalogue';
import { categoriesResource } from '@coaster/categories';
import { EstablishmentPermission } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources } from '@coaster/core';
import { permissionGuard } from '@coaster/establishment-members';
import { menuDraftResource } from '@coaster/menu';
import { productsResource } from '@coaster/products';

const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./inventory'),
    resources: nonBlockingResources((context) => {
      const establishmentId = establishmentIdOf(context);

      return {
        products: productsResource(establishmentId),
        categories: categoriesResource(establishmentId),
      };
    }),
  },

  {
    path: 'menu',
    loadComponent: () => import('./pages/menu/menu-editor'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU)],
    resources: nonBlockingResources((context) => {
      const establishmentId = establishmentIdOf(context);

      return {
        menu: menuDraftResource(establishmentId),
        products: productsResource(establishmentId),
        categories: categoriesResource(establishmentId),
      };
    }),
  },

  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-catalogue'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_IMPORT_CATALOGUE)],
    resources: nonBlockingResources((context) => ({
      starter: starterCatalogueResource(establishmentIdOf(context)),
    })),
  },
];

export default inventoryRoutes;
