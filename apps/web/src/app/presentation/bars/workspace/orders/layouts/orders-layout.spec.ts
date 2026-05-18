import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { asBarId } from '@coaster/common';
import { TranslateModule } from '@ngx-translate/core';

import OrdersLayout from './orders-layout';

describe('OrdersLayout', () => {
  let component: OrdersLayout;
  let fixture: ComponentFixture<OrdersLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersLayout, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersLayout);
    fixture.componentRef.setInput('barId', asBarId('bar-1'));
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
