import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import type { EstablishmentId } from '@coaster/common';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@coaster/core';
import { MyMemberStore } from '@coaster/establishment-members';
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
  let toastMock: { error: ReturnType<typeof vi.fn>; show: ReturnType<typeof vi.fn> };
  let myMemberMock: { hasPermission: ReturnType<typeof vi.fn> };
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

    toastMock = { error: vi.fn(), show: vi.fn() };
    myMemberMock = { hasPermission: vi.fn().mockReturnValue(true) };

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
        { provide: Toast, useValue: toastMock },
        { provide: MyMemberStore, useValue: myMemberMock },
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

  describe('someone who cannot pay', () => {
    it('should be told what happened instead of being shown a door that 403s', () => {
      myMemberMock.hasPermission.mockReturnValue(false);

      service.open(establishmentId);

      expect(dialogMock.open).not.toHaveBeenCalled();
      expect(storeMock.createCustomerPortalSession).not.toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith('billing.locked_ask_owner', 'info', 5000);
    });

    it('should not even reach the portal when the venue has a live subscription', () => {
      myMemberMock.hasPermission.mockReturnValue(false);
      storeMock.billingAction.set('MANAGE');

      service.open(establishmentId);

      expect(storeMock.createCustomerPortalSession).not.toHaveBeenCalled();
    });
  });
});
