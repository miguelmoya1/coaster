import type { Establishment } from '@coaster/common';
import { asEstablishmentId } from '@coaster/common';
import { DbEstablishment as EstablishmentDb } from '@coaster/core/db';

export const EstablishmentsMapper = {
  toDomain(dbEstablishment: EstablishmentDb): Establishment {
    return {
      id: asEstablishmentId(dbEstablishment.id),
      name: dbEstablishment.name,
      createdAt: dbEstablishment.createdAt.toISOString(),
      updatedAt: dbEstablishment.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Establishment): Establishment {
    return domainEntity;
  },
};
