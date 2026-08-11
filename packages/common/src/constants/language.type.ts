export const LANGUAGES = ['es', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

/**
 * Each language named in itself. A switcher exists for whoever does not read the current one, so
 * translating these would hide the option from the only person who needs it. Adding a language is
 * this entry plus the array above, and nothing else.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  es: 'Español',
  en: 'English',
};

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

export const asLanguage = (value: string | undefined | null): Language =>
  isLanguage(value) ? value : DEFAULT_LANGUAGE;
