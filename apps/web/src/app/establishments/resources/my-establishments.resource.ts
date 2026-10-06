import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@coaster/core';
import { EstablishmentRepository } from '../data-access/establishment-repository';
import { establishmentArrayMapper } from '../mappers/establishment.mapper';

export const myEstablishmentsResource = () => {
  const repository = inject(EstablishmentRepository);
  const auth = inject(Auth);

  return httpResource(
    () => (auth.isAuthLoaded() && auth.isAuthenticated() ? repository.routes.myEstablishments : undefined),
    { parse: establishmentArrayMapper },
  );
};
