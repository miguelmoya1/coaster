import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import type { EstablishmentId } from '@coaster/common';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@coaster/core';
import { EstablishmentSubscriptionStore } from '../store/establishment-subscription.store';
import { PlanDialogService } from './plan-dialog.service';

describe('PlanDialogService', () => {
  let service: PlanDialogService;
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

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialog, useValue: dialogMock },
        { provide: EstablishmentSubscriptionStore, useValue: { createCheckoutSession: vi.fn() } },
        { provide: Toast, useValue: { error: vi.fn() } },
      ],
    });

    service = TestBed.inject(PlanDialogService);
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
});
