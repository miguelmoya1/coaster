import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMemberForm],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
