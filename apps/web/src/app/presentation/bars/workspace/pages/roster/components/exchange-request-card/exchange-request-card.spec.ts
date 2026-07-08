import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarRole } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExchangeRequestCard } from './exchange-request-card';

describe('ExchangeRequestCard', () => {
  let component: ExchangeRequestCard;
  let fixture: ComponentFixture<ExchangeRequestCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRequestCard],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRequestCard);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('month', 'JAN');
    fixture.componentRef.setInput('day', '15');
    fixture.componentRef.setInput('roleName', BarRole.OWNER);
    fixture.componentRef.setInput('timeRange', '08:00 - 16:00');
    fixture.componentRef.setInput('offeredBy', 'John Doe');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the date correctly', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('JAN');
      expect(element.textContent).toContain('15');
    });

    it('should display shift details', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain(BarRole.OWNER);
      expect(element.textContent).toContain('08:00 - 16:00');
    });

    it('should display the requester', () => {
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('John Doe');
    });
  });

  describe('actions', () => {
    it('should emit accepted when button is clicked', () => {
      const spy = vi.spyOn(component.accepted, 'emit');
      const button = fixture.nativeElement.querySelector('button');

      button.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should hide accept button if isOwnRequest is true', () => {
      fixture.componentRef.setInput('isOwnRequest', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeNull();
    });

    it('should disable button if disabled input is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });
  });
});
