import { ComponentFixture, TestBed } from '@angular/core/testing';

import OrdersLayout from './orders-layout';

describe('OrdersLayout', () => {
  let component: OrdersLayout;
  let fixture: ComponentFixture<OrdersLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
