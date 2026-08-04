import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bars';
import type { BarId } from '@coaster/common';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionBanner } from './subscription-banner';

describe('SubscriptionBanner', () => {
  let fixture: ComponentFixture<SubscriptionBanner>;
  const isReadOnlySignal = signal(false);
  const isTrialExpiringSoonSignal = signal(false);
  const trialDaysRemainingSignal = signal(2);
  let planDialogServiceMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    isReadOnlySignal.set(false);
    isTrialExpiringSoonSignal.set(false);
    trialDaysRemainingSignal.set(2);
    planDialogServiceMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [SubscriptionBanner],
      providers: [
        provideTranslateService(),
        {
          provide: BarSubscriptionStore,
          useValue: {
          isReadOnly: isReadOnlySignal,
          isTrialExpiringSoon: isTrialExpiringSoonSignal,
          trialDaysRemaining: trialDaysRemainingSignal,
          showSubscriptionBanner: computed(() => isReadOnlySignal() || isTrialExpiringSoonSignal()),
          billingAction: signal('ACTIVATE'),
          },
        },
        {
          provide: PlanDialogService,
          useValue: planDialogServiceMock,
        },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('es', {
      billing: {
        banner: {
          read_only: 'Tu periodo de prueba ha finalizado. La aplicación está en modo lectura.',
          activate_pro: 'Activar Plan Premium',
          trial_expiring_one: 'Queda 1 día de prueba. ¡Suscríbete para mantener tus funciones activas!',
          trial_expiring_other: 'Quedan {{days}} días de prueba. ¡Suscríbete para mantener tus funciones activas!',
          view_plans: 'Ver Planes',
        },
      },
    });
    translate.use('es');

    fixture = TestBed.createComponent(SubscriptionBanner);
    fixture.componentRef.setInput('barId', 'bar-123' as BarId);
    fixture.detectChanges();
  });

  it('should render nothing when subscription is active / trial not expiring soon', () => {
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should render read-only banner when app is read-only', () => {
    isReadOnlySignal.set(true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('modo lectura');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(planDialogServiceMock.open).toHaveBeenCalledWith('bar-123');
  });

  it('should render expiring soon banner when trial has <= 3 days left', () => {
    isTrialExpiringSoonSignal.set(true);
    trialDaysRemainingSignal.set(2);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('2');
    expect(text).toContain('días de prueba');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(planDialogServiceMock.open).toHaveBeenCalledWith('bar-123');
  });
});
