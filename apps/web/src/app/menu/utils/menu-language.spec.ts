import { DEFAULT_LANGUAGE } from '@coaster/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { menuLanguageOf } from './menu-language';

describe('menuLanguageOf', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should use the language the link asks for', () => {
    expect(menuLanguageOf('en')).toBe('en');
  });

  it('should fall back to the language of the phone reading it', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');

    expect(menuLanguageOf(undefined)).toBe('en');
  });

  it('should fall back to the default when the phone speaks a language the menu does not', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('ja-JP');

    expect(menuLanguageOf(undefined)).toBe(DEFAULT_LANGUAGE);
  });
});
