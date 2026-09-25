import { asEstablishmentId, EstablishmentPermission } from '@coaster/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { provideTranslateService } from '@ngx-translate/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import OrdersLayout from './orders-layout';

describe('OrdersLayout', () => {
  let component: OrdersLayout;
  let fixture: ComponentFixture<OrdersLayout>;
  const granted = new Set<EstablishmentPermission>();

  const myMemberStoreMock = {
    hasPermission: vi.fn((permission: EstablishmentPermission) => granted.has(permission)),
  };

  const render = async () => {
    fixture = TestBed.createComponent(OrdersLayout);
    fixture.componentRef.setInput('establishmentId', asEstablishmentId('establishment-1'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const cashCloseLink = () =>
    Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a')).find((a) =>
      a.getAttribute('href')?.endsWith('/cash-close'),
    );

  beforeEach(async () => {
    granted.clear();

    await TestBed.configureTestingModule({
      imports: [OrdersLayout],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: MyMemberStore, useValue: myMemberStoreMock },
      ],
    }).compileComponents();
  });

  it('should create', async () => {
    await render();
    expect(component).toBeTruthy();
  });

  it('should show the till tab to whoever can close it', async () => {
    granted.add(EstablishmentPermission.ESTABLISHMENT_CLOSE_CASH);
    await render();

    expect(cashCloseLink()).toBeTruthy();
  });

  it('should hide the till tab from staff', async () => {
    await render();

    expect(cashCloseLink()).toBeUndefined();
  });
});
