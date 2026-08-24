import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstablishmentSubscriptionStore, PlanDialogService } from '@coaster/establishment-subscription';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartItem, PosCart } from './pos-cart';

describe('PosCart', () => {
  let component: PosCart;
  let fixture: ComponentFixture<PosCart>;

  const items: CartItem[] = [
    { productId: 'p-1', productName: 'Beer', price: 250, quantity: 2 },
    { productId: 'p-2', productName: 'Water', price: 150, quantity: 1, notes: 'no ice' },
  ];

  const query = (selector: string) => fixture.nativeElement.querySelector(selector);
  const click = (selector: string) => {
    query(selector).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosCart],
      providers: [
        provideTranslateService(),
        { provide: EstablishmentSubscriptionStore, useValue: { isReadOnly: () => false } },
        { provide: PlanDialogService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosCart);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('collapsed bar', () => {
    it('should show the total units and amount without the item list', () => {
      expect(query('[data-testid="cart-toggle"]').textContent).toContain('3');
      expect(fixture.nativeElement.textContent).toContain('€6.50');
      expect(query('[data-testid="item-notes-btn"]')).toBeNull();
    });

    it('should keep the submit button reachable while collapsed', () => {
      expect(query('[data-testid="submit-order-btn"]')).toBeTruthy();
    });

    it('should replace the bar with a hint when the cart is empty', () => {
      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();

      expect(query('[data-testid="cart-toggle"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('orders.empty_cart');
    });
  });

  describe('expanding', () => {
    it('should reveal the item list on toggle', () => {
      click('[data-testid="cart-toggle"]');

      expect(fixture.nativeElement.querySelectorAll('[data-testid="item-notes-btn"]').length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('Beer');
    });

    it('should collapse again when the cart empties', () => {
      click('[data-testid="cart-toggle"]');
      expect(component.expanded()).toBe(true);

      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();

      expect(component.expanded()).toBe(false);
    });
  });

  describe('notes', () => {
    beforeEach(() => click('[data-testid="cart-toggle"]'));

    it('should hide the notes input until its icon is clicked', () => {
      expect(query('[data-testid="item-notes-input"]')).toBeNull();

      click('[data-testid="item-notes-btn"]');

      expect(query('[data-testid="item-notes-input"]')).toBeTruthy();
    });

    it('should show existing notes as text when not editing', () => {
      expect(fixture.nativeElement.textContent).toContain('no ice');
    });

    it('should emit the typed notes for the edited item', () => {
      const emitted: { productId: string; notes: string }[] = [];
      component.itemNotesChanged.subscribe((event) => emitted.push(event));

      click('[data-testid="item-notes-btn"]');
      const input: HTMLInputElement = query('[data-testid="item-notes-input"]');
      input.value = 'extra cold';
      input.dispatchEvent(new Event('input'));

      expect(emitted).toEqual([{ productId: 'p-1', notes: 'extra cold' }]);
    });

    it('should hide the order notes textarea until its button is clicked', () => {
      expect(query('[data-testid="order-notes-input"]')).toBeNull();

      click('[data-testid="order-notes-btn"]');

      expect(query('[data-testid="order-notes-input"]')).toBeTruthy();
    });
  });
});
