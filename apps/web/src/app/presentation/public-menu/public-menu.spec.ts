import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PublishedMenu } from '@coaster/common';
import { PublicMenuStore } from '@coaster/menu';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicMenu from './public-menu';

describe('PublicMenu', () => {
  let component: PublicMenu;
  let fixture: ComponentFixture<PublicMenu>;

  const published: PublishedMenu = {
    name: 'Carta de Bar Pepe',
    language: 'es',
    languages: ['es', 'en'],
    sections: [
      {
        name: 'Cafetería',
        items: [
          { name: 'Café Solo', description: 'Recién molido', price: 120, allergens: [] },
          { name: 'Croquetas', price: 600, allergens: ['GLUTEN', 'MILK'] },
        ],
      },
    ],
  };

  const menu = signal<PublishedMenu | null>(published);
  const isLoading = signal(false);

  const storeMock = {
    menu: {
      isLoading: () => isLoading(),
      hasValue: () => menu() !== null,
      value: () => menu(),
    },
    setSlug: vi.fn(),
    setLanguage: vi.fn(),
  };

  const build = async (lang?: string) => {
    await TestBed.configureTestingModule({
      imports: [PublicMenu],
      providers: [provideTranslateService(), { provide: PublicMenuStore, useValue: storeMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicMenu);
    fixture.componentRef.setInput('slug', 'bar-pepe');

    if (lang) {
      fixture.componentRef.setInput('lang', lang);
    }

    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    menu.set(published);
    isLoading.set(false);
  });

  it('should render the sections and their items', async () => {
    await build();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cafetería');
    expect(text).toContain('Café Solo');
    expect(text).toContain('Recién molido');
  });

  it('should ask the API for the slug in the address', async () => {
    await build();

    expect(storeMock.setSlug).toHaveBeenCalledWith('bar-pepe');
  });

  it('should honour a language in the address over the browser one', async () => {
    await build('en');

    expect(component['language']()).toBe('en');
    expect(storeMock.setLanguage).toHaveBeenCalledWith('en');
  });

  it('should fall back to Spanish when the address asks for one the app does not have', async () => {
    await build('de');

    expect(component['language']()).toBe('es');
  });

  it('should offer only the languages the menu itself carries', async () => {
    await build();

    expect(component['languages']()).toEqual(['es', 'en']);
  });

  it('should name each language in itself, not as a code', async () => {
    await build();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Español');
    expect(text).toContain('English');
  });

  it('should switch language on demand', async () => {
    await build();

    component['choose']('en');

    expect(storeMock.setLanguage).toHaveBeenLastCalledWith('en');
  });

  it('should say the menu is not there rather than show an empty page', async () => {
    menu.set(null);

    await build();

    expect(fixture.nativeElement.textContent).toContain('MENU_NOT_FOUND');
  });

  it('should show nothing about the establishment beyond the menu itself', async () => {
    await build();

    const rendered = fixture.nativeElement.textContent as string;

    expect(rendered).not.toContain('stock');
    expect(rendered).not.toContain('establishment-');
  });

  it('should list the allergens a line declares', async () => {
    await build();

    expect(fixture.nativeElement.textContent).toContain('allergens.GLUTEN');
  });
});
