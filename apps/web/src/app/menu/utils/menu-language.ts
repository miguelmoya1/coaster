import type { Language } from '@coaster/common';
import { asLanguage } from '@coaster/common';

export const menuLanguageOf = (asked: string | undefined): Language =>
  asLanguage(asked ?? navigator.language.split('-')[0]);
