import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId } from '@coaster/core';
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
      name: 'templates.products.cafe_solo',
      price: 120,
      categoryId: asCategoryId('cat-1'),
      currentStock: 10,
      minStockAlert: 5,
      stockStatus: 'GOOD',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: asProductId('p-2'),
      name: 'templates.products.agua',
      price: 150,
      categoryId: asCategoryId('cat-2'),
      currentStock: 0,
      minStockAlert: 10,
      stockStatus: 'WARNING',
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
    // The second card should be out of stock
    expect(cards[1].className).toContain('opacity-60');
    expect(cards[1].className).toContain('border-error/30');
  });
});
