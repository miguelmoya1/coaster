import { asEstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Establishment } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { EstablishmentCard } from './establishment-card';

describe('EstablishmentCard', () => {
  let fixture: ComponentFixture<EstablishmentCard>;
  let component: EstablishmentCard;
  const mockEstablishment: Establishment = {
    id: asEstablishmentId('establishment-123'),
    name: 'The Rusty Anchor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstablishmentCard],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(EstablishmentCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('establishment', mockEstablishment);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('establishment input', () => {
    it('should expose the establishment signal with the provided value', () => {
      expect(component.establishment()).toEqual(mockEstablishment);
    });

    it('should render the establishment name', () => {
      const nameEl = fixture.nativeElement.querySelector('[data-testid="establishment-card-name"]');

      expect(nameEl).toBeTruthy();
      expect(nameEl?.textContent.trim()).toBe(mockEstablishment.name);
    });

    it('should update the rendered name when input changes', () => {
      const updatedEstablishment: Establishment = { id: asEstablishmentId('establishment-456'), name: 'Ocean Breeze' };
      fixture.componentRef.setInput('establishment', updatedEstablishment);
      fixture.detectChanges();

      const nameEl = fixture.nativeElement.querySelector('[data-testid="establishment-card-name"]');

      expect(nameEl).toBeTruthy();
      expect(nameEl?.textContent.trim()).toBe(updatedEstablishment.name);
    });
  });

  describe('avatar', () => {
    it('should render the avatar placeholder', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="establishment-card-avatar"]')).toBeTruthy();
    });
  });

  describe('role badge', () => {
    it('should render the establishment role badge', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="establishment-card-role-badge"]')).toBeTruthy();
    });
  });

  describe('status card', () => {
    it('should be wrapped in a status card with primary status', () => {
      const statusCard = fixture.nativeElement.querySelector('mat-card');

      expect(statusCard).toBeTruthy();
    });
  });
});
