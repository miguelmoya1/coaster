import { Component, output, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { InviteBarMemberDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { TextInput, Button } from '../../../shared';

@Component({
  selector: 'coaster-invite-member-form',
  imports: [FormRoot, TextInput, FormField, Button, TranslatePipe],
  template: `
    <form [formRoot]="form">
      <coaster-text-input
        [formField]="form.email"
        label="Email"
        placeholder="Email"
      />

      <div class="flex justify-end mt-4 gap-2">
        <coaster-button class="w-full" type="button" variant="outline">{{ 'members.invite.cancel_btn' | translate }}</coaster-button>

        <coaster-button class="w-full" type="submit" variant="primary">{{ 'members.invite.invite_btn' | translate }}</coaster-button>
      </div>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class InviteMemberForm {
  public readonly inviteMember = output<InviteBarMemberDto>();

  readonly #formBase = signal<InviteBarMemberDto>({
    email: '',
  });
  protected readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.email);
      email(fields.email);
      minLength(fields.email, 3);
      maxLength(fields.email, 255);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();
          this.inviteMember.emit(payload);
        },
      },
    },
  );
}
