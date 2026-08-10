import type { EstablishmentId, EstablishmentModule, EstablishmentSettings } from '@coaster/common';
import { resolveModules } from '@coaster/common';
import type { DbEstablishmentSettings } from '@coaster/core/db';

export const EstablishmentSettingsMapper = {
  toDto(row: DbEstablishmentSettings): EstablishmentSettings {
    return {
      establishmentId: row.establishmentId as EstablishmentId,
      modules: resolveModules(row.modules as EstablishmentModule[]),
      configuredAt: row.configuredAt?.toISOString() ?? null,
    };
  },
};
