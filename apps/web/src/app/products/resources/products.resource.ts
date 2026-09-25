import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { onRealtime, Realtime, removeById, updateLoaded, upsertById } from '@coaster/core';
import { ProductRepository } from '../data-access/product-repository';
import { productArrayMapper, productMapper } from '../mappers/product.mapper';
import type { Product } from '../models/product.interface';

export const productsResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(ProductRepository);
  const realtime = inject(Realtime);

  const products = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.list(id) : undefined;
    },
    { parse: productArrayMapper },
  );

  const place = (payload: unknown) =>
    updateLoaded(products, (list: Product[]) => upsertById(list, productMapper(payload)));

  onRealtime(realtime.productCreated, place);
  onRealtime(realtime.productUpdated, place);
  onRealtime(realtime.productStockChanged, place);
  onRealtime(realtime.productDeleted, ({ id }) => updateLoaded(products, (list) => removeById(list, id)));
  onRealtime(realtime.catalogueImported, () => products.reload());

  return products;
};
