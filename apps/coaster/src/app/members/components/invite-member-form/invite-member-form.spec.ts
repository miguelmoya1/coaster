import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InviteMemberForm } from './invite-member-form';

import { TranslateModule } from '@ngx-translate/core';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMemberForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
