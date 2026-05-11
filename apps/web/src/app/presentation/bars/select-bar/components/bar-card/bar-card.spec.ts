import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { BarCard } from './bar-card';

describe('BarCard', () => {
  let fixture: ComponentFixture<BarCard>;
  let component: BarCard;
  const mockBar: Bar = {
    id: asBarId('bar-123'),
    name: 'The Rusty Anchor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarCard],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(BarCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('bar', mockBar);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('bar input', () => {
    it('should expose the bar signal with the provided value', () => {
      expect(component.bar()).toEqual(mockBar);
    });

    it('should render the bar name', () => {
      const nameEl = fixture.nativeElement.querySelector('[data-testid="bar-card-name"]');

      expect(nameEl).toBeTruthy();
      expect(nameEl?.textContent.trim()).toBe(mockBar.name);
    });

    it('should update the rendered name when input changes', () => {
      const updatedBar: Bar = { id: asBarId('bar-456'), name: 'Ocean Breeze' };
      fixture.componentRef.setInput('bar', updatedBar);
      fixture.detectChanges();

      const nameEl = fixture.nativeElement.querySelector('[data-testid="bar-card-name"]');

      expect(nameEl).toBeTruthy();
      expect(nameEl?.textContent.trim()).toBe(updatedBar.name);
    });
  });

  describe('avatar', () => {
    it('should render the avatar placeholder', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="bar-card-avatar"]')).toBeTruthy();
    });
  });

  describe('role badge', () => {
    it('should render the bar role badge', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="bar-card-role-badge"]')).toBeTruthy();
    });
  });

  describe('status card', () => {
    it('should be wrapped in a status card with primary status', () => {
      const statusCard = fixture.nativeElement.querySelector('coaster-status-card');

      expect(statusCard).toBeTruthy();
    });
  });
});
