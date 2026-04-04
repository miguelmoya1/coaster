import { Component, input, model, output, signal } from '@angular/core';
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
import { Button, FormFieldMessages, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-invite-member-form',
  imports: [
    FormRoot,
    TextInput,
    FormField,
    Button,
    TranslatePipe,
    FormFieldMessages,
  ],
  template: `
    <form [formRoot]="form">
      <coaster-text-input
        [formField]="form.email"
        label="Email"
        placeholder="Email"
      />

      @if (error(); as error) {
        <coaster-form-field-messages
          [invalid]="true"
          [errors]="[{ message: error | translate, kind: '' }]"
        />
      }

      <div class="flex justify-end mt-4 gap-2">
        <coaster-button
          class="w-full"
          type="button"
          variant="outline"
          [disabled]="disabled()"
          (click)="canceled.emit()"
        >
          {{ 'members.invite.cancel_btn' | translate }}
        </coaster-button>

        <coaster-button
          class="w-full"
          type="submit"
          variant="primary"
          [disabled]="disabled()"
        >
          {{ 'members.invite.invite_btn' | translate }}
        </coaster-button>
      </div>
    </form>
  `,
})
export class InviteMemberForm {
  public readonly inviteMember = output<InviteBarMemberDto>();
  public readonly canceled = output<void>();

  public readonly disabled = input.required<boolean>();
  public readonly error = model.required<string | undefined>();

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
