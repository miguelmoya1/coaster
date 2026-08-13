import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstablishmentRole } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EstablishmentRoleBadge } from './establishment-role-badge';

describe('EstablishmentRoleBadge', () => {
  let fixture: ComponentFixture<EstablishmentRoleBadge>;
  let component: EstablishmentRoleBadge;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstablishmentRoleBadge],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(EstablishmentRoleBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('role input', () => {
    it('should default to undefined when no role is provided', () => {
      expect(component.role()).toBeUndefined();
    });

    it('should accept a role input', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.OWNER);
      fixture.detectChanges();

      expect(component.role()).toBe(EstablishmentRole.OWNER);
    });
  });

  describe('dotColorClass computed', () => {
    it('should return default color when no role is provided', () => {
      expect(component.dotColorClass()).toContain('bg-primary');
      expect(component.dotColorClass()).toContain('text-primary');
    });

    it('should return primary colors for OWNER role', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.OWNER);
      fixture.detectChanges();

      expect(component.dotColorClass()).toBe('bg-primary text-primary');
    });

    it('should return orange colors for STAFF role', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.STAFF);
      fixture.detectChanges();

      expect(component.dotColorClass()).toBe('bg-orange-500 text-orange-500');
    });
  });

  describe('labelKey computed', () => {
    it('should return operational label when no role is provided', () => {
      expect(component.labelKey()).toBe('establishments.select.operational');
    });

    it('should return owner label for OWNER role', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.OWNER);
      fixture.detectChanges();

      expect(component.labelKey()).toBe('common.role.owner');
    });

    it('should return staff label for STAFF role', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.STAFF);
      fixture.detectChanges();

      expect(component.labelKey()).toBe('common.role.staff');
    });
  });

  describe('rendering', () => {
    it('should render the badge container', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="establishment-role-badge"]')).toBeTruthy();
    });

    it('should render the status dot', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="establishment-role-badge-dot"]')).toBeTruthy();
    });

    it('should render the label', () => {
      expect(fixture.nativeElement.querySelector('[data-testid="establishment-role-badge-label"]')).toBeTruthy();
    });

    it('should apply dot color classes to the dot element', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.STAFF);
      fixture.detectChanges();

      const dot = fixture.nativeElement.querySelector('[data-testid="establishment-role-badge-dot"]');

      expect(dot.classList).toContain('bg-orange-500');
      expect(dot.classList).toContain('text-orange-500');
    });

    it('should update dot classes when role changes', () => {
      fixture.componentRef.setInput('role', EstablishmentRole.STAFF);
      fixture.detectChanges();

      const dot = fixture.nativeElement.querySelector('[data-testid="establishment-role-badge-dot"]');
      expect(dot.classList).toContain('bg-orange-500');

      fixture.componentRef.setInput('role', EstablishmentRole.OWNER);
      fixture.detectChanges();

      expect(dot.classList).toContain('bg-primary');
      expect(dot.classList).toContain('text-primary');
    });
  });
});
