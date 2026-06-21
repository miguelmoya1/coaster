import type { Bar } from '@coaster/common';
import { asBarId } from '../../core';
import { DbBar as BarDb } from '../../core/db';

export const BarsMapper = {
  toDomain(dbBar: BarDb): Bar {
    return {
      id: asBarId(dbBar.id),
      name: dbBar.name,
      createdAt: dbBar.createdAt.toISOString(),
      updatedAt: dbBar.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Bar): Bar {
    return domainEntity;
  },
};
