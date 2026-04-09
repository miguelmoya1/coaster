import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffMemberCard } from './staff-member-card';

describe('StaffMemberCard', () => {
  let component: StaffMemberCard;
  let fixture: ComponentFixture<StaffMemberCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffMemberCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffMemberCard);
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
