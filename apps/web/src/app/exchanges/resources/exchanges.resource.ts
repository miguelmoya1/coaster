import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';
import { exchangeArrayMapper } from '../mappers/exchange.mapper';

export const exchangesResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(ExchangeRepository);

  return httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.listPending(id) : undefined;
    },
    { parse: exchangeArrayMapper },
  );
};
