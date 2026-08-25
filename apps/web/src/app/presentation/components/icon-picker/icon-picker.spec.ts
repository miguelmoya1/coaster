import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IconPicker, isMaterialIconName, SUGGESTED_ICONS } from './icon-picker';

describe('IconPicker', () => {
  let fixture: ComponentFixture<IconPicker>;

  const trigger = (): HTMLButtonElement => fixture.nativeElement.querySelector('[data-testid="icon-picker-trigger"]');
  const search = (): HTMLInputElement => fixture.nativeElement.querySelector('[data-testid="icon-picker-search"]');
  const options = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  const grid = (): HTMLElement => fixture.nativeElement.querySelector('[data-testid="icon-picker-grid"]');

  const type = (term: string) => {
    search().value = term;
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const scrollToBottom = () => {
    const element = grid();
    Object.defineProperty(element, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: 400, configurable: true });
    element.scrollTop = 1600;
    element.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  };

  const open = async () => {
    trigger().click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeAll(async () => {
    await import('./material-icon-names');
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconPicker],
      providers: [provideTranslateService({})],
    }).compileComponents();

    fixture = TestBed.createComponent(IconPicker);
    fixture.detectChanges();
  });

  it('should show the chosen icon on the trigger', () => {
    fixture.componentRef.setInput('value', 'sports_bar');
    fixture.detectChanges();

    expect(trigger().textContent).toContain('sports_bar');
  });

  it('should keep the catalogue closed until it is asked for', () => {
    expect(search()).toBeNull();
  });

  it('should offer the trade-relevant icons before anything is typed', async () => {
    await open();

    expect(options().length).toBe(SUGGESTED_ICONS.length);
    expect(options()[0].getAttribute('aria-label')).toBe(SUGGESTED_ICONS[0]);
  });

  it('should search the whole Material set, not just the suggestions', async () => {
    await open();

    search().value = 'wine';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const labels = options().map((option) => option.getAttribute('aria-label'));

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((label) => label?.includes('wine'))).toBe(true);
  });

  it('should find an icon nobody had curated by hand', async () => {
    await open();

    search().value = 'candle';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options().map((option) => option.getAttribute('aria-label'))).toContain('candle');
  });

  it('should read a typed space as the underscore Material uses', async () => {
    await open();

    search().value = 'local bar';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options().map((option) => option.getAttribute('aria-label'))).toContain('local_bar');
  });

  it('should say so rather than render an empty grid when nothing matches', async () => {
    await open();

    search().value = 'zzzznope';
    search().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(options()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('should hand back the chosen icon and close', async () => {
    await open();

    options()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe(SUGGESTED_ICONS[1]);
    expect(search()).toBeNull();
  });

  describe('loading more as you scroll', () => {
    it('should start with one batch rather than four thousand glyphs', async () => {
      await open();
      type('a');

      expect(options().length).toBe(90);
    });

    it('should append the next batch when the grid reaches the bottom', async () => {
      await open();
      type('a');
      scrollToBottom();

      expect(options().length).toBe(180);
    });

    it('should keep appending until the matches run out and then stop', async () => {
      await open();
      type('wine');

      const total = options().length;

      scrollToBottom();

      expect(options().length).toBe(total);
    });

    it('should go back to the first batch when the search changes', async () => {
      await open();
      type('a');
      scrollToBottom();
      type('ab');

      expect(options().length).toBeLessThanOrEqual(90);
    });
  });
});

describe('isMaterialIconName', () => {
  it('should accept the snake_case ligatures Material actually ships', () => {
    expect(isMaterialIconName('water_drop')).toBe(true);
    expect(isMaterialIconName('coffee')).toBe(true);
    expect(isMaterialIconName('10k')).toBe(false);
  });

  it('should reject the kebab-case names that render as nothing', () => {
    expect(isMaterialIconName('water-drop')).toBe(false);
    expect(isMaterialIconName('lunch-dining')).toBe(false);
  });

  it('should reject an absent icon rather than throw', () => {
    expect(isMaterialIconName(null)).toBe(false);
    expect(isMaterialIconName(undefined)).toBe(false);
    expect(isMaterialIconName('')).toBe(false);
  });
});
