import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import type { EstablishmentId } from '@coaster/common';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@coaster/core';
import { EstablishmentSubscriptionStore } from '../store/establishment-subscription.store';
import { BillingEntryPoint } from './billing-entry-point';

describe('BillingEntryPoint', () => {
  let service: BillingEntryPoint;
  let storeMock: {
    billingAction: ReturnType<typeof signal<string>>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
    createCustomerPortalSession: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let afterClosed$: Subject<unknown>;

  const establishmentId = 'establishment-1' as EstablishmentId;

  beforeEach(() => {
    vi.clearAllMocks();
    afterClosed$ = new Subject();

    dialogMock = {
      open: vi.fn().mockReturnValue({
        close: vi.fn(),
        afterClosed: () => afterClosed$.asObservable(),
      }),
    };

    storeMock = {
      billingAction: signal('ACTIVATE'),
      createCheckoutSession: vi.fn(),
      createCustomerPortalSession: vi.fn().mockResolvedValue('https://portal.stripe.com'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialog, useValue: dialogMock },
        { provide: EstablishmentSubscriptionStore, useValue: storeMock },
        { provide: Toast, useValue: { error: vi.fn() } },
      ],
    });

    service = TestBed.inject(BillingEntryPoint);
  });

  it('should open the plan dialog', () => {
    service.open(establishmentId);

    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('should not stack dialogs when opened repeatedly', () => {
    service.open(establishmentId);
    service.open(establishmentId);
    service.open(establishmentId);

    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('should allow reopening once the dialog has been closed', () => {
    service.open(establishmentId);
    afterClosed$.next(undefined);

    service.open(establishmentId);

    expect(dialogMock.open).toHaveBeenCalledTimes(2);
  });

  describe('a door that leads where the API allows', () => {
    it('should never open checkout while Stripe still has a subscription', async () => {
      storeMock.billingAction.set('MANAGE');

      service.open(establishmentId);
      await Promise.resolve();

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(storeMock.createCustomerPortalSession).toHaveBeenCalled();
    });

    it('should open checkout when there is nothing to manage yet', () => {
      storeMock.billingAction.set('ACTIVATE');

      service.open(establishmentId);

      expect(dialogMock.open).toHaveBeenCalled();
      expect(storeMock.createCustomerPortalSession).not.toHaveBeenCalled();
    });
  });
});
