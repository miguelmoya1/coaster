import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItemCard } from './inventory-item-card';

import { provideTranslateService } from '@ngx-translate/core';

describe('InventoryItemCard', () => {
  let component: InventoryItemCard;
  let fixture: ComponentFixture<InventoryItemCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemCard],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryItemCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('itemName', 'Beer');
    fixture.componentRef.setInput('qty', 10);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the item name and quantity', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('Beer');
      expect(element.textContent).toContain('10');
    });

    it('should apply critical styles and text when statusLevel is critical', () => {
      fixture.componentRef.setInput('statusLevel', 'critical');
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('Critical');

      const hostElement: HTMLElement = fixture.nativeElement;
      expect(hostElement.classList.contains('border-error')).toBe(true);
    });

    it('should apply low stock styles and text when statusLevel is low', () => {
      fixture.componentRef.setInput('statusLevel', 'low');
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('Low Stock');

      const hostElement: HTMLElement = fixture.nativeElement;
      expect(hostElement.classList.contains('border-tertiary')).toBe(true);
    });
  });

  describe('actions', () => {
    it('should emit editClicked when edit button is clicked', () => {
      fixture.componentRef.setInput('showEditButton', true);
      fixture.detectChanges();

      const spy = vi.spyOn(component.editClicked, 'emit');
      const editButton = fixture.nativeElement.querySelector('button');

      editButton.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should stop propagation on edit click', () => {
      fixture.componentRef.setInput('showEditButton', true);
      fixture.detectChanges();

      const event = new MouseEvent('click');
      const stopSpy = vi.spyOn(event, 'stopPropagation');

      component.onEditClick(event);

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should apply disabled styles and attributes when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const hostElement: HTMLElement = fixture.nativeElement;
      expect(hostElement.classList.contains('opacity-50')).toBe(true);
      expect(hostElement.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
