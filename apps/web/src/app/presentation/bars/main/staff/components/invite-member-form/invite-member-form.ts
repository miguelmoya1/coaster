import { Component, inject, output, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { InviteBarMemberDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MembersStore } from '../../../../../../members/store/members.store';
import { CoasterBtn, FormFieldMessages, TextInput } from '../../../../../../shared';

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
          [disabled]="form().disabled() || form().submitting()"
          (click)="canceled.emit()"
        >
          {{ 'common.cancel' | translate }}
        </button>

        <button
          coaster-btn
          class="w-full"
          type="submit"
          variant="primary"
          [disabled]="form().disabled() || form().submitting()"
        >
          {{ 'common.invite' | translate }}
        </button>
      </div>
    </form>
  `,
})
export class InviteMemberForm {
  public readonly canceled = output<void>();
  public readonly invited = output<void>();

  readonly #membersStore = inject(MembersStore);
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

          const error = this.#membersStore.invite(payload);

          if (error) {
            return error;
          }

          this.invited.emit();
          return null;
        },
      },
    },
  );

  protected cancelHandle() {
    this.canceled.emit();
  }
}
