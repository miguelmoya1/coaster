import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MenuDraft } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { MenuStore } from '@coaster/menu';
import { CategoriesStore } from '@coaster/categories';
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
        { id: 'prod-1', name: 'Café Solo', price: 120, categoryId: 'cat-1' },
        { id: 'prod-2', name: 'Croquetas', price: 600, categoryId: 'cat-2' },
      ]),
    },
    setEstablishmentId: vi.fn(),
  };

  const categoriesStoreMock = {
    list: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue([
        { id: 'cat-1', name: 'Cafetería' },
        { id: 'cat-2', name: 'Tapas' },
        { id: 'cat-3', name: 'Vacía' },
      ]),
    },
    setEstablishmentId: vi.fn(),
  };

  const feedbackMock = { success: vi.fn(), error: vi.fn() };

  const build = async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [MenuEditor],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MenuStore, useValue: menuStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
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

  describe('an edit survives change detection', () => {
    it('should keep a section that was removed removed', () => {
      component['addSection']();
      component['addSection']();
      fixture.detectChanges();

      component['removeSection'](0);
      fixture.detectChanges();

      expect(component['sections']()).toHaveLength(1);
    });

    it('should keep a section that was added added', () => {
      component['addSection']();

      fixture.detectChanges();

      expect(component['sections']()).toHaveLength(1);
    });

    it('should keep a section moved up where it was moved to', () => {
      component['addSection']();
      component['addSection']();
      component['setSectionName'](0, 'Primera');
      component['setSectionName'](1, 'Segunda');
      fixture.detectChanges();

      component['moveSection'](1, -1);
      fixture.detectChanges();

      expect(component['sections']().map((section) => section.translations.es?.name)).toEqual(['Segunda', 'Primera']);
    });

    it('should show the new order on screen, not just hold it in memory', () => {
      component['addSection']();
      component['addSection']();
      component['setSectionName'](0, 'Primera');
      component['setSectionName'](1, 'Segunda');
      fixture.detectChanges();

      component['moveSection'](1, -1);
      fixture.detectChanges();

      const names = Array.from(
        fixture.nativeElement.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>,
      ).map((input) => input.value);

      expect(names.slice(0, 2)).toEqual(['Segunda', 'Primera']);
    });

    it('should keep an item moved up where it was moved to', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');
      component['addItem'](0, 'prod-2');
      fixture.detectChanges();

      component['moveItem'](0, 1, -1);
      fixture.detectChanges();

      expect(component['sections']()[0].items.map((item) => item.productId)).toEqual(['prod-2', 'prod-1']);
    });

    it('should keep the wording that was typed', () => {
      component['addSection']();
      component['setSectionName'](0, 'Cafetería');

      fixture.detectChanges();

      expect(component['sections']()[0].translations.es?.name).toBe('Cafetería');
    });
  });

  describe('the buttons on screen', () => {
    const sectionAt = (index: number): Element =>
      fixture.nativeElement.querySelectorAll('[data-testid="menu-section"]')[index];
    const itemRows = (index: number) => sectionAt(index).querySelectorAll('[data-testid="menu-item"]');
    const buttonsOf = (element: Element) => Array.from(element.querySelectorAll('button')) as HTMLButtonElement[];

    const twoSectionsWithItems = () => {
      component['addSection']();
      component['addSection']();
      component['setSectionName'](0, 'Primera');
      component['setSectionName'](1, 'Segunda');
      component['addItem'](0, 'prod-1');
      component['addItem'](0, 'prod-2');
      component['addItem'](1, 'prod-1');
      component['addItem'](1, 'prod-2');
      fixture.detectChanges();
    };

    it('should move the second line of the first section up, leaving the second section alone', () => {
      twoSectionsWithItems();

      const [up] = buttonsOf(itemRows(0)[1]);
      up.click();
      fixture.detectChanges();

      expect(component['sections']()[0].items.map((item) => item.productId)).toEqual(['prod-2', 'prod-1']);
      expect(component['sections']()[1].items.map((item) => item.productId)).toEqual(['prod-1', 'prod-2']);
    });

    it('should remove the right line, not one from another section', () => {
      twoSectionsWithItems();

      const buttons = buttonsOf(itemRows(1)[0]);
      buttons[buttons.length - 1].click();
      fixture.detectChanges();

      expect(component['sections']()[1].items.map((item) => item.productId)).toEqual(['prod-2']);
      expect(component['sections']()[0].items).toHaveLength(2);
    });

    it('should hide the line it was pressed on', () => {
      twoSectionsWithItems();

      const buttons = buttonsOf(itemRows(1)[0]);
      buttons[buttons.length - 2].click();
      fixture.detectChanges();

      expect(component['sections']()[1].items[0].isVisible).toBe(false);
      expect(component['sections']()[0].items.every((item) => item.isVisible)).toBe(true);
    });

    it('should write wording into the line it was typed in', () => {
      twoSectionsWithItems();

      const input = itemRows(1)[0].querySelector('input[type="text"]') as HTMLInputElement;
      input.value = 'Café de la casa';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component['sections']()[1].items[0].translations.es?.name).toBe('Café de la casa');
      expect(component['sections']()[0].items.every((item) => !item.translations.es)).toBe(true);
    });

    it('should delete the section its own button belongs to', () => {
      twoSectionsWithItems();

      const headerButtons = buttonsOf(sectionAt(1).querySelector('.items-end') as Element);
      headerButtons[headerButtons.length - 1].click();
      fixture.detectChanges();

      expect(component['sections']()).toHaveLength(1);
      expect(component['sections']()[0].translations.es?.name).toBe('Primera');
    });
  });

  describe('editing the structure', () => {
    it('should add and remove sections', () => {
      component['addSection']();
      component['addSection']();
      expect(component['sections']().length).toBe(2);

      component['removeSection'](0);
      expect(component['sections']().length).toBe(1);
    });

    it('should leave the list alone when the index is behind the array, rather than punch a hole', () => {
      component['addSection']();
      component['addSection']();

      component['moveSection'](2, -1);

      expect(component['sections']()).toHaveLength(2);
      expect(component['sections']().every(Boolean)).toBe(true);
    });

    it('should survive an arrow pressed on a line that has just gone', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');
      component['addItem'](0, 'prod-2');
      component['removeItem'](0, 1);

      component['moveItem'](0, 1, -1);
      fixture.detectChanges();

      expect(component['sections']()[0].items).toHaveLength(1);
      expect(component['sections']()[0].items.every(Boolean)).toBe(true);
      expect(component['missingWording']()).toBeTypeOf('number');
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

      expect(component['sections']()[0].items).toEqual([{ productId: 'prod-1', isVisible: true, translations: {} }]);
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

  describe('what the editor explains', () => {
    it('should offer as optional every language except the menu own one', () => {
      expect(component['extraLanguages']()).toEqual(['en']);
    });

    it('should show what a customer would read when a name is left blank', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');

      expect(component['itemPlaceholder'](component['sections']()[0].items[0])).toBe('Café Solo');
    });

    it('should say where a price comes from', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');
      expect(component['priceOrigin'](component['sections']()[0].items[0])).toBe('menu.price_from_product');

      component['setItemPrice'](0, 0, '200');
      expect(component['priceOrigin'](component['sections']()[0].items[0])).toBe('menu.price_own');
    });
  });

  describe('bringing the catalogue in', () => {
    it('should offer it only while the menu is still empty', () => {
      expect(component['canFillFromCatalogue']()).toBe(true);

      component['addSection']();

      expect(component['canFillFromCatalogue']()).toBe(false);
    });

    it('should make a section per category that has products', () => {
      component['fillFromCatalogue']();

      const sections = component['sections']();

      expect(sections).toHaveLength(2);
      expect(sections.map((section) => section.translations.es?.name)).toEqual(['Cafetería', 'Tapas']);
    });

    it('should leave the wording empty so the product name is what reads', () => {
      component['fillFromCatalogue']();

      const [first] = component['sections']();

      expect(first.items).toEqual([{ productId: 'prod-1', isVisible: true, translations: {} }]);
      expect(component['itemName'](first.items[0], 'es')).toBe('Café Solo');
    });
  });

  describe('hiding a line', () => {
    it('should flip and unflip a single item', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');

      component['toggleItemVisible'](0, 0);
      expect(component['sections']()[0].items[0].isVisible).toBe(false);

      component['toggleItemVisible'](0, 0);
      expect(component['sections']()[0].items[0].isVisible).toBe(true);
    });

    it('should add new lines visible', () => {
      component['addSection']();
      component['addItem'](0, 'prod-1');

      expect(component['sections']()[0].items[0].isVisible).toBe(true);
    });
  });

  describe('when publishing is offered', () => {
    it('should always be offered while the menu has never been published', () => {
      expect(component['canPublish']()).toBe(true);
    });

    it('should stay offered while the server reports pending changes', async () => {
      draft.set({ ...draft(), publishedAt: '2026-08-11T10:00:00.000Z', hasUnpublishedChanges: true });
      await build();

      expect(component['canPublish']()).toBe(true);
    });

    it('should not be offered when published and nothing has moved', async () => {
      draft.set({ ...draft(), publishedAt: '2026-08-11T10:00:00.000Z', hasUnpublishedChanges: false });
      await build();

      expect(component['canPublish']()).toBe(false);
    });

    it('should come back as soon as something is edited on screen', async () => {
      draft.set({ ...draft(), publishedAt: '2026-08-11T10:00:00.000Z', hasUnpublishedChanges: false });
      await build();

      component['addSection']();

      expect(component['canPublish']()).toBe(true);
    });

    it('should settle again once the edit is saved', async () => {
      draft.set({ ...draft(), publishedAt: '2026-08-11T10:00:00.000Z', hasUnpublishedChanges: false });
      await build();
      component['addSection']();

      await component['save']();

      expect(component['canPublish']()).toBe(false);
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
