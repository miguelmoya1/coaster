import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoriesStore } from '@coaster/categories';
import { ProductsStore } from '@coaster/products';
import { TemplatesStore } from '@coaster/templates';
import { Toast } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportTemplates from './import-templates';

describe('ImportTemplates', () => {
  let component: ImportTemplates;
  let fixture: ComponentFixture<ImportTemplates>;

  const templatesStoreMock = {
    categories: {
      value: vi.fn().mockReturnValue([{ id: 'cat-1', name: 'Licores' }]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    products: {
      value: vi.fn().mockReturnValue([{ id: 'prod-1', name: 'Vodka', price: 1500, categoryId: 'cat-1' }]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    importToBar: vi.fn().mockResolvedValue(null),
  };

  const categoriesStoreMock = {
    reloadCategories: vi.fn(),
  };

  const productsStoreMock = {
    reloadProducts: vi.fn(),
  };

  const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportTemplates],
      providers: [
        provideTranslateService(),
        provideRouter([
          { path: 'bars/:barId/pantry', component: class {} }
        ]),
        { provide: TemplatesStore, useValue: templatesStoreMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: Toast, useValue: toastMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(ImportTemplates);
    fixture.componentRef.setInput('barId', 'bar-123');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute matched templates reactively', () => {
    const templates = component.matchedTemplates();
    expect(templates.length).toBe(1);
    expect(templates[0].id).toBe('cat-1');
    expect(templates[0].products.length).toBe(1);
    expect(templates[0].products[0].id).toBe('prod-1');
  });

  it('should handle search queries correctly', () => {
    component.searchQuery.set('Vodka');
    fixture.detectChanges();
    expect(component.filteredTemplates().length).toBe(1);

    component.searchQuery.set('Nonexistent');
    fixture.detectChanges();
    expect(component.filteredTemplates().length).toBe(0);
  });

  it('should manage selection state correctly', () => {
    expect(component.selectedCategoryIds().has('cat-1')).toBeFalsy();

    component.toggleCategory('cat-1');
    expect(component.selectedCategoryIds().has('cat-1')).toBeTruthy();

    component.toggleCategory('cat-1');
    expect(component.selectedCategoryIds().has('cat-1')).toBeFalsy();
  });

  it('should call importToBar and reload stores on successful import', async () => {
    component.toggleCategory('cat-1');
    await component.importSelected();

    expect(templatesStoreMock.importToBar).toHaveBeenCalledWith('bar-123', ['cat-1']);
    expect(categoriesStoreMock.reloadCategories).toHaveBeenCalled();
    expect(productsStoreMock.reloadProducts).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
  });
});
