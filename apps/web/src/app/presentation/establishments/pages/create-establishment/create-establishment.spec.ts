import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EstablishmentListStore } from '@coaster/establishments';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateEstablishment from './create-establishment';

describe('CreateEstablishment', () => {
  let component: CreateEstablishment;
  let fixture: ComponentFixture<CreateEstablishment>;
  let router: Router;

  const establishmentListStoreMock = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEstablishment],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: EstablishmentListStore, useValue: establishmentListStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEstablishment);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show section title', () => {
      const sectionTitle = fixture.nativeElement.querySelector('.heading-1');
      expect(sectionTitle).toBeTruthy();
    });

    it('should show badge text', () => {
      const badge = fixture.nativeElement.querySelector('coaster-page-header');
      expect(badge).toBeTruthy();
    });

    it('should show create establishment form', () => {
      const form = fixture.nativeElement.querySelector('[data-testid="create-establishment-form"]');
      expect(form).toBeTruthy();
    });

    it('should show description text', () => {
      const description = fixture.nativeElement.querySelector('.text-on-surface-variant');
      expect(description).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should navigate to select establishment on submit', () => {
      component['onSubmit']();
      expect(router.navigate).toHaveBeenCalledWith(['/establishments/select']);
    });

    it('should navigate to select establishment on cancel', () => {
      component['onCancel']();
      expect(router.navigate).toHaveBeenCalledWith(['/establishments/select']);
    });
  });
});
