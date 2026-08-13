import { asEstablishmentId } from '@coaster/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { describe, beforeEach, it, expect } from 'vitest';

import OrdersLayout from './orders-layout';

describe('OrdersLayout', () => {
  let component: OrdersLayout;
  let fixture: ComponentFixture<OrdersLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersLayout],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersLayout);
    fixture.componentRef.setInput('establishmentId', asEstablishmentId('establishment-1'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
