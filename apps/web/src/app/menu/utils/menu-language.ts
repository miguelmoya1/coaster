import { asLanguage, type Language } from '@coaster/core';

export const menuLanguageOf = (asked: string | undefined): Language =>
  asLanguage(asked ?? navigator.language.split('-')[0]);
