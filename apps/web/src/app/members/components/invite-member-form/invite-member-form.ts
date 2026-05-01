import { Component, input, output, signal } from '@angular/core';
import {
    email,
    form,
    FormField,
    FormRoot,
    maxLength,
    minLength,
    required,
    TreeValidationResult,
} from '@angular/forms/signals';
import { InviteBarMemberDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, FormFieldMessages, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-invite-member-form',
  imports: [FormRoot, TextInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
    <form [formRoot]="form">
      <coaster-text-input [formField]="form.email" label="Email" placeholder="Email" />

      @if (form().errors().length > 0) {
        <coaster-form-field-messages [invalid]="true" [errors]="form().errors()" />
      }

      <div class="flex justify-end mt-4 gap-2">
        <button
          coaster-btn
          class="w-full"
          type="button"
          variant="outline"
          [disabled]="disabled()"
          (click)="canceled.emit()"
        >
          {{ 'common.cancel' | translate }}
        </button>

        <button coaster-btn class="w-full" type="submit" variant="primary" [disabled]="disabled()">
          {{ 'common.invite' | translate }}
        </button>
      </div>
    </form>
  `,
})
export class InviteMemberForm {
  readonly disabled = input.required<boolean>();
  readonly submitAction = input.required<(payload: InviteBarMemberDto) => Promise<TreeValidationResult>>();

  readonly canceled = output<void>();

  readonly #formBase = signal<InviteBarMemberDto>({
    email: '',
  });

  readonly form = form(
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
          const action = this.submitAction();

          return await action(payload);
        },
      },
    },
  );
}
