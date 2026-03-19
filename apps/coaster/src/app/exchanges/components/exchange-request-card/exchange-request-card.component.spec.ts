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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
