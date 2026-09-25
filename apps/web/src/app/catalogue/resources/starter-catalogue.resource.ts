import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, StarterCatalogueCategory } from '@coaster/common';
import { CatalogueRepository } from '../data-access/catalogue-repository';

export const starterCatalogueResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(CatalogueRepository);

  return httpResource<StarterCatalogueCategory[]>(() => {
    const id = establishmentId();
    return id ? repository.routes.starter(id) : undefined;
  });
};
