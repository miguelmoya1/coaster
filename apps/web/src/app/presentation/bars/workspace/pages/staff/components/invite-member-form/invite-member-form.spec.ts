import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMemberForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // describe('rendering', () => {
  //   it('should enable buttons when disabled input is false', () => {
  //     component.disabled.set(false);
  //     fixture.detectChanges();

  //     const buttons = fixture.nativeElement.querySelectorAll('button');
  //     buttons.forEach((button: HTMLButtonElement) => {
  //       expect(button.disabled).toBe(false);
  //     });
  //   });
  // });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');
      const cancelButton = fixture.nativeElement.querySelectorAll('button')[0];

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });

    // it('should call submitAction when form is valid and submitted', async () => {
    //   // Set value via DOM to ensure typical interaction flow
    //   const input = fixture.nativeElement.querySelector('input');
    //   input.value = 'test@test.com';
    //   input.dispatchEvent(new Event('input'));
    //   fixture.detectChanges();

    //   const submitButton = fixture.nativeElement.querySelectorAll('button')[1];
    //   submitButton.click();

    //   // Wait for async form submission
    //   expect(component.isValid()).toBe(true);
    // });
  });
});
