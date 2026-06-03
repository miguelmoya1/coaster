import type { Category } from '@coaster/common';
import { asBarId, asCategoryId } from '../../core';
import { Category as CategoryDb } from '../../core';

export const CategoriesMapper = {
  toDomain(dbCategory: CategoryDb): Category {
    return {
      id: asCategoryId(dbCategory.id),
      barId: asBarId(dbCategory.barId),
      name: dbCategory.name,
      icon: dbCategory.icon ?? undefined,
    };
  },

  toDto(domainEntity: Category): Category {
    return domainEntity;
  },
};
