import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogueStore } from '@coaster/catalogue';
import { CategoriesStore } from '@coaster/categories';
import { ProductsStore } from '@coaster/products';
import { Toast } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportCatalogue from './import-catalogue';

describe('ImportCatalogue', () => {
  let component: ImportCatalogue;
  let fixture: ComponentFixture<ImportCatalogue>;

  const catalogueStoreMock = {
    starter: {
      value: vi.fn().mockReturnValue([
        {
          key: 'vinos_y_licores',
          name: 'Licores',
          icon: 'liquor',
          products: [{ name: 'Vodka', price: 1500 }],
        },
      ]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setEstablishmentId: vi.fn(),
    import: vi.fn().mockResolvedValue(undefined),
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
      imports: [ImportCatalogue],
      providers: [
        provideTranslateService(),
        provideRouter([{ path: 'establishments/:establishmentId/inventory', component: class {} }]),
        { provide: CatalogueStore, useValue: catalogueStoreMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: Toast, useValue: toastMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(ImportCatalogue);
    fixture.componentRef.setInput('establishmentId', 'establishment-123');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should scope the catalogue to the establishment, since its language decides the wording', () => {
    expect(catalogueStoreMock.setEstablishmentId).toHaveBeenCalledWith('establishment-123');
  });

  it('should read the categories with their products already nested', () => {
    const categories = component.starterCategories();

    expect(categories.length).toBe(1);
    expect(categories[0].key).toBe('vinos_y_licores');
    expect(categories[0].products.length).toBe(1);
    expect(categories[0].products[0].name).toBe('Vodka');
  });

  it('should handle search queries correctly', () => {
    component.searchQuery.set('Vodka');
    fixture.detectChanges();
    expect(component.filteredCategories().length).toBe(1);

    component.searchQuery.set('Nonexistent');
    fixture.detectChanges();
    expect(component.filteredCategories().length).toBe(0);
  });

  it('should manage selection state correctly', () => {
    expect(component.selectedCategoryKeys().has('vinos_y_licores')).toBeFalsy();

    component.toggleCategory('vinos_y_licores');
    expect(component.selectedCategoryKeys().has('vinos_y_licores')).toBeTruthy();

    component.toggleCategory('vinos_y_licores');
    expect(component.selectedCategoryKeys().has('vinos_y_licores')).toBeFalsy();
  });

  it('should reactively compute selectedCategoriesCount and selectedProductsCount', () => {
    expect(component.selectedCategoriesCount()).toBe(0);
    expect(component.selectedProductsCount()).toBe(0);

    component.toggleCategory('vinos_y_licores');
    expect(component.selectedCategoriesCount()).toBe(1);
    expect(component.selectedProductsCount()).toBe(1);

    component.toggleCategory('vinos_y_licores');
    expect(component.selectedCategoriesCount()).toBe(0);
    expect(component.selectedProductsCount()).toBe(0);
  });

  it('should import the selected keys and reload what the inventory already loaded', async () => {
    component.toggleCategory('vinos_y_licores');
    await component.importSelected();

    expect(catalogueStoreMock.import).toHaveBeenCalledWith('establishment-123', ['vinos_y_licores']);
    expect(categoriesStoreMock.reloadCategories).toHaveBeenCalled();
    expect(productsStoreMock.reloadProducts).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
  });
});
