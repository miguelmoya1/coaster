import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExchangeRequestCard } from './exchange-request-card';

describe('ExchangeRequestCard', () => {
  let component: ExchangeRequestCard;
  let fixture: ComponentFixture<ExchangeRequestCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRequestCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ExchangeRequestCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('month', 'Jan');
    fixture.componentRef.setInput('day', '1');
    fixture.componentRef.setInput('shiftPeriod', 'Morning');
    fixture.componentRef.setInput('roleName', 'Bartender');
    fixture.componentRef.setInput('timeRange', '08:00 - 16:00');
    fixture.componentRef.setInput('offeredBy', 'John Doe');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
