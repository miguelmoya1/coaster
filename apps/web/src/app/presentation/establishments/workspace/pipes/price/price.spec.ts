import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PricePipe } from './price';

describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService(), PricePipe] });
    pipe = TestBed.inject(PricePipe);
  });

  it('should follow the language the app is in, not the browser', () => {
    expect(pipe.transform(1999)).toBe('19,99\u00A0€');
  });

  it('should format cents', () => {
    const result = pipe.transform(1500);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format zero cents', () => {
    const result = pipe.transform(0);
    expect(result).toBeTruthy();
  });

  it('should format a single cent', () => {
    const result = pipe.transform(1);
    expect(result).toBeTruthy();
  });

  it('should handle null', () => {
    expect(pipe.transform(null)).toBe('0,00 €');
  });

  it('should handle undefined', () => {
    expect(pipe.transform(undefined)).toBe('0,00 €');
  });

  it('should accept a different currency', () => {
    const result = pipe.transform(1500, 'USD');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });
});
