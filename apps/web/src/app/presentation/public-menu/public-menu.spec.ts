import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PublishedMenu } from '@coaster/common';
import { provideRouter, Router } from '@angular/router';
import { fakeResource } from '@coaster/testing';
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

  let menu = fakeResource(published);

  const build = async (lang?: string) => {
    await TestBed.configureTestingModule({
      imports: [PublicMenu],
      providers: [provideTranslateService(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicMenu);
    fixture.componentRef.setInput('slug', 'bar-pepe');
    fixture.componentRef.setInput('published', menu.resource);

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
    menu = fakeResource(published);
  });

  it('should render the sections and their items', async () => {
    await build();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cafetería');
    expect(text).toContain('Café Solo');
    expect(text).toContain('Recién molido');
  });

  it('should show progress while the menu is on its way, not that it is missing', async () => {
    menu = fakeResource<PublishedMenu>();

    await build();

    expect(fixture.nativeElement.textContent).not.toContain('MENU_NOT_FOUND');
    expect(fixture.nativeElement.querySelector('coaster-loading')).toBeTruthy();
  });

  it('should honour a language in the address over the browser one', async () => {
    await build('en');

    expect(component['language']()).toBe('en');
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
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component['choose']('en');

    expect(navigate).toHaveBeenCalledWith(['/m', 'bar-pepe'], { queryParams: { lang: 'en' } });
  });

  it('should say the menu is not there rather than show an empty page', async () => {
    menu = fakeResource<PublishedMenu>();
    menu.fail(new Error('MENU_NOT_FOUND'));

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
