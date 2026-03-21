import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffMemberCardComponent } from './staff-member-card.component';

describe('StaffMemberCardComponent', () => {
  let component: StaffMemberCardComponent;
  let fixture: ComponentFixture<StaffMemberCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StaffMemberCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('staffName', 'Test Name');
    fixture.componentRef.setInput('staffImage', 'test.jpg');
    fixture.componentRef.setInput('roleName', 'Test Role');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
