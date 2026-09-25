import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { Category, EstablishmentId } from '@coaster/common';
import { onRealtime, Realtime, removeById, updateLoaded, upsertById } from '@coaster/core';
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

  onRealtime(realtime.categoryCreated, place);
  onRealtime(realtime.categoryUpdated, place);
  onRealtime(realtime.categoryDeleted, ({ id }) => updateLoaded(categories, (list) => removeById(list, id)));
  onRealtime(realtime.catalogueImported, () => categories.reload());

  return categories;
};
