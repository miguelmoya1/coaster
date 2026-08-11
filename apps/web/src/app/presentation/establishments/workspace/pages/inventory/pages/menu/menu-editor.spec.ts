import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MenuDraft } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { MenuStore } from '@coaster/menu';
import { ProductsStore } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MenuEditor from './menu-editor';

describe('MenuEditor', () => {
  let component: MenuEditor;
  let fixture: ComponentFixture<MenuEditor>;

  const draft = signal<MenuDraft>({
    id: 'menu-1' as MenuDraft['id'],
    slug: 'bar-pepe',
    name: 'Carta',
    defaultLanguage: 'es',
    languages: ['es'],
    hasUnpublishedChanges: true,
    sections: [],
  });

  const menuStoreMock = {
    draft: Object.assign(draft, {
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn(() => draft()),
    }),
    setEstablishmentId: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    unpublish: vi.fn().mockResolvedValue(undefined),
  };

  const productsStoreMock = {
    list: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue([
        { id: 'prod-1', name: 'Café Solo', price: 120 },
        { id: 'prod-2', name: 'Croquetas', price: 600 },
      ]),
    },
    setEstablishmentId: vi.fn(),
  };

  const feedbackMock = { success: vi.fn(), error: vi.fn() };

  const build = async () => {
    await TestBed.configureTestingModule({
      imports: [MenuEditor],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MenuStore, useValue: menuStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: ActionFeedback, useValue: feedbackMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuEditor);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    draft.set({
      id: 'menu-1' as MenuDraft['id'],
      slug: 'bar-pepe',
      name: 'Carta',
      defaultLanguage: 'es',
      languages: ['es'],
      hasUnpublishedChanges: true,
      sections: [],
    });
    await build();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('editing the structure', () => {
    it('should add and remove sections', () => {
      component['addSection']();
      component['addSection']();
      expect(component['sections']().length).toBe(2);

      component['removeSection'](0);
      expect(component['sections']().length).toBe(1);
    });

    it('should reorder by swapping, and refuse to move past the ends', () => {
      component['addSection']();
      component['addSection']();
      component['setSectionName'](0, 'Primera');
      component['setSectionName'](1, 'Segunda');

      component['moveSection'](1, -1);
      expect(component['sections']()[0].translations.es?.name).toBe('Segunda');

      component['moveSection'](0, -1);
      expect(component['sections']()[0].translations.es?.name).toBe('Segunda');
    });

    it('should write wording into the language being edited, not the default', () => {
      component['offered'].set(['es', 'en']);
      component['addSection']();

      component['setSectionName'](0, 'Cafetería');
      component['editingLanguage'].set('en');
      component['setSectionName'](0, 'Coffee');

      expect(component['sections']()[0].translations).toEqual({ es: { name: 'Cafetería' }, en: { name: 'Coffee' } });
    });

    it('should add an item carrying only the product, so the name comes from the catalogue', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');

      expect(component['sections']()[0].items).toEqual([{ productId: 'prod-1', translations: {} }]);
      expect(component['itemName'](component['sections']()[0].items[0], 'es')).toBe('Café Solo');
    });

    it('should ignore the empty option of the product picker', () => {
      component['addSection']();
      component['addItem'](0, '');

      expect(component['sections']()[0].items).toEqual([]);
    });

    it('should take the product price until the line is given one of its own', () => {
      component['addSection']();
      component['addItem'](0, 'prod-2');
      expect(component['priceOf'](component['sections']()[0].items[0])).toBe(600);

      component['setItemPrice'](0, 0, '750');
      expect(component['priceOf'](component['sections']()[0].items[0])).toBe(750);
    });

    it('should clear an own price when the field is emptied rather than store zero', () => {
      component['addSection']();
      component['addItem'](0, 'prod-2');
      component['setItemPrice'](0, 0, '750');

      component['setItemPrice'](0, 0, '');

      expect(component['sections']()[0].items[0].price).toBeUndefined();
    });
  });

  describe('languages', () => {
    it('should refuse to drop the language everything falls back to', () => {
      component['toggleLanguage']('es');

      expect(component['offered']()).toEqual(['es']);
      expect(feedbackMock.error).toHaveBeenCalled();
    });

    it('should add and remove any other language', () => {
      component['toggleLanguage']('en');
      expect(component['offered']()).toEqual(['es', 'en']);

      component['toggleLanguage']('en');
      expect(component['offered']()).toEqual(['es']);
    });

    it('should stop editing a language it no longer offers', () => {
      component['toggleLanguage']('en');
      component['editingLanguage'].set('en');

      component['toggleLanguage']('en');

      expect(component['editingLanguage']()).toBe('es');
    });

    it('should count what is still unwritten in every language offered', () => {
      component['toggleLanguage']('en');
      component['addSection']();
      component['setSectionName'](0, 'Cafetería');

      expect(component['missingWording']()).toBe(1);

      component['editingLanguage'].set('en');
      component['setSectionName'](0, 'Coffee');

      expect(component['missingWording']()).toBe(0);
    });
  });

  describe('publishing', () => {
    it('should save before publishing, so what goes out is what is on screen', async () => {
      component['addSection']();
      component['setSectionName'](0, 'Cafetería');

      await component['publish']();

      expect(menuStoreMock.save).toHaveBeenCalledWith('establishment-1', {
        name: 'Carta',
        languages: ['es'],
        sections: [{ translations: { es: { name: 'Cafetería' } }, items: [] }],
      });
      expect(menuStoreMock.publish).toHaveBeenCalledWith('establishment-1');
    });

    it('should report a failed save instead of claiming it published', async () => {
      menuStoreMock.save.mockRejectedValueOnce(new Error('nope'));

      await component['publish']();

      expect(menuStoreMock.publish).not.toHaveBeenCalled();
      expect(feedbackMock.error).toHaveBeenCalled();
      expect(feedbackMock.success).not.toHaveBeenCalled();
    });

    it('should not fire twice while a save is in flight', async () => {
      let release = () => {};
      menuStoreMock.save.mockImplementationOnce(() => new Promise<void>((resolve) => (release = () => resolve())));

      const first = component['save']();
      await component['save']();
      release();
      await first;

      expect(menuStoreMock.save).toHaveBeenCalledTimes(1);
    });
  });
});
