import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShiftCardComponent } from './shift-card.component';

describe('ShiftCardComponent', () => {
  let component: ShiftCardComponent;
  let fixture: ComponentFixture<ShiftCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftCardComponent);
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
