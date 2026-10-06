import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { Category } from '../models/category.interface';
import { onRealtime, Realtime, removeById, updateLoaded, upsertById, type EstablishmentId } from '@coaster/core';
import { CategoryRepository } from '../data-access/category-repository';
import { categoryArrayMapper, categoryMapper } from '../mappers/category.mapper';

export const categoriesResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(CategoryRepository);
  const realtime = inject(Realtime);

  const categories = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.list(id) : undefined;
    },
    { parse: categoryArrayMapper },
  );

  const place = (payload: Category) => updateLoaded(categories, (list) => upsertById(list, categoryMapper(payload)));

  onRealtime(realtime.on<Category>('categoryCreated'), place);
  onRealtime(realtime.on<Category>('categoryUpdated'), place);
  onRealtime(realtime.on<{ id: string }>('categoryDeleted'), ({ id }) =>
    updateLoaded(categories, (list) => removeById(list, id)),
  );
  onRealtime(realtime.on<{ establishmentId: string }>('catalogueImported'), () => categories.reload());
  onRealtime(realtime.reconnected, () => categories.reload());

  return categories;
};
