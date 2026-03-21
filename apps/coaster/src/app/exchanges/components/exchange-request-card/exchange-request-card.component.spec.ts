import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExchangeRequestCardComponent } from './exchange-request-card.component';

describe('ExchangeRequestCardComponent', () => {
  let component: ExchangeRequestCardComponent;
  let fixture: ComponentFixture<ExchangeRequestCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExchangeRequestCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExchangeRequestCardComponent);
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
