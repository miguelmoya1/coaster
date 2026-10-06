import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import { onRealtime, Realtime, removeById, updateLoaded, upsertById, type EstablishmentId } from '@coaster/core';
import { ProductRepository } from '../data-access/product-repository';
import { productArrayMapper, productMapper } from '../mappers/product.mapper';
import type { Product, ProductResponse } from '../models/product.interface';

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

  onRealtime(realtime.on<ProductResponse>('productCreated'), place);
  onRealtime(realtime.on<ProductResponse>('productUpdated'), place);
  onRealtime(realtime.on<ProductResponse>('productStockChanged'), place);
  onRealtime(realtime.on<{ id: string }>('productDeleted'), ({ id }) =>
    updateLoaded(products, (list) => removeById(list, id)),
  );
  onRealtime(realtime.on<{ establishmentId: string }>('catalogueImported'), () => products.reload());
  onRealtime(realtime.reconnected, () => products.reload());

  return products;
};
