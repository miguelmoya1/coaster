import type { EstablishmentId, EstablishmentModule, EstablishmentSettings } from '@coaster/common';
import { asLanguage, resolveModules } from '@coaster/common';
import type { DbEstablishmentSettings } from '@coaster/core/db';

export const EstablishmentSettingsMapper = {
  toDto(row: DbEstablishmentSettings): EstablishmentSettings {
    return {
      establishmentId: row.establishmentId as EstablishmentId,
      modules: resolveModules(row.modules as EstablishmentModule[]),
      language: asLanguage(row.language),
      markSoldOut: row.markSoldOut,
      configuredAt: row.configuredAt?.toISOString() ?? null,
    };
  },
};
