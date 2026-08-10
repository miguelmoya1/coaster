import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Socket } from '@coaster/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMemberForm],
      providers: [
        provideTranslateService(),
        {
          provide: Socket,
          useValue: {
            memberRemoved: signal<any>(null),
            memberInvited: signal<any>(null),
            memberRoleChanged: signal<any>(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      const cancelButton = buttons.find((button) => button.textContent?.trim().toLowerCase().includes('cancel'))!;

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });
  });
});
