export const LANGUAGES = ['es', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

export const asLanguage = (value: string | undefined | null): Language =>
  isLanguage(value) ? value : DEFAULT_LANGUAGE;
