import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShiftCard } from './shift-card';

describe('ShiftCard', () => {
  let component: ShiftCard;
  let fixture: ComponentFixture<ShiftCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('staffName', 'Test Name');
    fixture.componentRef.setInput('staffImage', 'test.jpg');
    fixture.componentRef.setInput('timeRange', '08:00 - 16:00');
    fixture.componentRef.setInput('roleName', 'Test Role');
    fixture.componentRef.setInput('roleColorClass', 'text-primary');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
