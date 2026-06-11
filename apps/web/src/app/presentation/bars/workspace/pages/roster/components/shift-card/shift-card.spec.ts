import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftCard } from './shift-card';

describe('ShiftCard', () => {
  let component: ShiftCard;
  let fixture: ComponentFixture<ShiftCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftCard],
      providers: [provideTranslateService()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftCard);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('staffName', 'John Doe');
    fixture.componentRef.setInput('staffImage', 'https://photo.url/john.jpg');
    fixture.componentRef.setInput('timeRange', '08:00 - 16:00');
    fixture.componentRef.setInput('roleName', 'OWNER');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display staff details and time range', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('John Doe');
      expect(element.textContent).toContain('08:00 - 16:00');
      expect(element.textContent).toContain('OWNER');

      const img = element.querySelector('img');
      expect(img?.src).toBe('https://photo.url/john.jpg');
    });

    it('should show exchange button if isOwn is true', () => {
      fixture.componentRef.setInput('isOwn', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('roster.offer_exchange');
    });

    it('should not show exchange button if isOwn is false', () => {
      fixture.componentRef.setInput('isOwn', false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeNull();
    });

    it('should show pending text on button if hasPendingExchange is true', () => {
      fixture.componentRef.setInput('isOwn', true);
      fixture.componentRef.setInput('hasPendingExchange', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('roster.exchange_pending');
      expect(button.disabled).toBe(true);
    });
  });

  describe('actions', () => {
    it('should emit offerExchange when exchange button is clicked', () => {
      fixture.componentRef.setInput('isOwn', true);
      fixture.detectChanges();

      const spy = vi.spyOn(component.offerExchange, 'emit');
      const button = fixture.nativeElement.querySelector('button');

      button.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should stop propagation on offer exchange click', () => {
      fixture.componentRef.setInput('isOwn', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopSpy = vi.spyOn(event, 'stopPropagation');

      button.dispatchEvent(event);

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
