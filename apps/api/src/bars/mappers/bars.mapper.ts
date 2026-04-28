import { asBarId, Bar } from '@coaster/common';
import { Bar as BarDb } from '../../core';

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
