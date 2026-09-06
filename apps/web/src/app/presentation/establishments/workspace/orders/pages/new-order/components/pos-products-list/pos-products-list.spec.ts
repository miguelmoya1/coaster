import { asCategoryId, asProductId } from '@coaster/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Product } from '@coaster/products';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PosProductsList } from './pos-products-list';

describe('PosProductsList', () => {
  let component: PosProductsList;
  let fixture: ComponentFixture<PosProductsList>;

  const mockProducts: Product[] = [
    {
      id: asProductId('p-1'),
      name: 'Café Solo',
      price: 120,
      categoryId: asCategoryId('cat-1'),
      currentStock: 10,
      minStockAlert: 5,
      taxRate: 1000,
      stockStatus: 'GOOD',
      allergens: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-2'),
      name: 'Agua Mineral',
      price: 150,
      categoryId: asCategoryId('cat-2'),
      currentStock: 0,
      minStockAlert: 10,
      taxRate: 1000,
      stockStatus: 'WARNING',
      allergens: [],
      lastUpdated: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosProductsList],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PosProductsList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('products', mockProducts);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all products', () => {
    const cards = fixture.nativeElement.querySelectorAll('mat-card');
    expect(cards.length).toBe(2);
  });

  it('should emit productClicked on product click', () => {
    const clickSpy = vi.spyOn(component.productClicked, 'emit');
    const firstButton = fixture.nativeElement.querySelector('button');
    firstButton.click();

    expect(clickSpy).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('should add out-of-stock class to card and button if stock is 0', () => {
    const cards = fixture.nativeElement.querySelectorAll('mat-card');
    expect(cards[1].className).toContain('opacity-60');
    expect(cards[1].className).toContain('border-error/30');
  });

  describe('the product tile picture', () => {
    const withPicture = (extra: Partial<Product>): Product => ({ ...mockProducts[0], ...extra });

    it('should draw the icon when the product has one and no photo', () => {
      fixture.componentRef.setInput('products', [withPicture({ icon: 'coffee', imageUrl: undefined })]);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('[data-testid="pos-product-icon"]');

      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('coffee');
    });

    it("should prefer the venue's own photo over the icon", () => {
      fixture.componentRef.setInput('products', [
        withPicture({ icon: 'coffee', imageUrl: 'https://example.test/cafe.webp' }),
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="pos-product-icon"]')).toBeNull();
    });

    it('should draw neither when the product has no icon and no photo', () => {
      fixture.componentRef.setInput('products', [withPicture({ icon: undefined, imageUrl: undefined })]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('img')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="pos-product-icon"]')).toBeNull();
    });
  });
});
