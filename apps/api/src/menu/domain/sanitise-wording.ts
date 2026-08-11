import type { Language, MenuTranslations, MenuWording } from '@coaster/common';
import { isLanguage } from '@coaster/common';

export const MAX_NAME = 80;
export const MAX_DESCRIPTION = 300;

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().slice(0, max);

  return trimmed || undefined;
};

const wording = (value: unknown): MenuWording | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { name, description } = value as Record<string, unknown>;
  const cleaned: MenuWording = { name: text(name, MAX_NAME), description: text(description, MAX_DESCRIPTION) };

  return cleaned.name || cleaned.description ? cleaned : undefined;
};

/**
 * Bounds what reaches the column rather than rejecting the save: the map is keyed by language, so a
 * key nobody offers is noise to drop, not an error worth losing an edit over.
 */
export const sanitiseTranslations = (translations: unknown, offered: Language[]): MenuTranslations => {
  if (typeof translations !== 'object' || translations === null) {
    return {};
  }

  const allowed = new Set(offered);
  const cleaned: MenuTranslations = {};

  for (const [language, value] of Object.entries(translations)) {
    if (!isLanguage(language) || !allowed.has(language)) {
      continue;
    }

    const entry = wording(value);

    if (entry) {
      cleaned[language] = entry;
    }
  }

  return cleaned;
};
