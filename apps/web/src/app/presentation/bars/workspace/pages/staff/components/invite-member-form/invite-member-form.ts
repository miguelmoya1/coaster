import { Component, inject, output, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { InviteBarMemberDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { MembersStore } from '@coaster/members';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-invite-member-form',
  imports: [FormRoot, MatFormField, MatLabel, MatInput, MatError, FormField, MatButton, TranslatePipe],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-2 mb-6">
        <h2 class="heading-2 m-0 p-0">{{ 'members.invite.title' | translate }}</h2>
        <p class="text-on-surface-variant text-sm m-0 p-0 leading-relaxed">
          {{ 'members.invite.description' | translate }}
        </p>
      </div>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Email</mat-label>
        <input matInput [formField]="form.email" placeholder="Email" />
        @if (form.email().errors().length > 0) {
          <mat-error>{{
            form.email().errors()[0].message || form.email().errors()[0].kind | translate: form.email().errors()[0]
          }}</mat-error>
        }
      </mat-form-field>

      @if (form().errors().length > 0) {
        <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
          @for (error of form().errors(); track error) {
            <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
          }
        </div>
      }

      <div class="flex justify-end mt-4 gap-2">
        <button
          mat-stroked-button
          class="w-full"
          type="button"
          [disabled]="form().disabled() || form().submitting()"
          (click)="canceled.emit()"
        >
          {{ 'common.cancel' | translate }}
        </button>

        <button mat-flat-button class="w-full" type="submit" [disabled]="form().disabled() || form().submitting()">
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

          try {
            await this.#membersStore.invite(payload);
            this.invited.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected cancelHandle() {
    this.canceled.emit();
  }
}
