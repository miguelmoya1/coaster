import type { Category } from '@coaster/common';
import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { DbCategory as CategoryDb } from '@coaster/core/db';

export const CategoriesMapper = {
  toDomain(dbCategory: CategoryDb): Category {
    return {
      id: asCategoryId(dbCategory.id),
      establishmentId: asEstablishmentId(dbCategory.establishmentId),
      name: dbCategory.name,
      icon: dbCategory.icon ?? undefined,
    };
  },

  toDto(domainEntity: Category): Category {
    return domainEntity;
  },
};
