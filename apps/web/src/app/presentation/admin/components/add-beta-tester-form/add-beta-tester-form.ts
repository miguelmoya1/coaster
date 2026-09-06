import { Component, inject, output, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { AdminBetaTestersStore } from '@coaster/admin';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../components/field/field';
import { CoasterInput } from '../../../components/field/input.directive';

interface AddBetaTesterFormValue {
  email: string;
  note: string;
}

@Component({
  selector: 'coaster-add-beta-tester-form',
  imports: [
    FormRoot,
    FormField,
    MatButton,
    MatIcon,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    TranslatePipe,
    Field,
    CoasterInput,
  ],
  template: `
    <form [formRoot]="form">
      <h2 mat-dialog-title class="flex items-center gap-3 m-0 p-0 text-xl font-bold text-on-surface">
        <span class="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <mat-icon>person_add</mat-icon>
        </span>
        {{ 'admin.beta_testers.add' | translate }}
      </h2>

      <mat-dialog-content class="min-w-[min(90vw,26rem)] flex flex-col gap-4">
        <coaster-field [label]="'admin.beta_testers.add_email' | translate">
          <input
            coasterInput
            type="email"
            autocomplete="off"
            inputmode="email"
            enterkeyhint="next"
            [formField]="form.email"
          />
        </coaster-field>

        <coaster-field
          [label]="'admin.beta_testers.add_note' | translate"
          [hint]="'admin.beta_testers.add_note_hint' | translate"
        >
          <input coasterInput enterkeyhint="send" [formField]="form.note" />
        </coaster-field>

        @if (form().errors().length > 0) {
          <div class="flex flex-col gap-1" role="alert">
            @for (error of form().errors(); track error) {
              <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end gap-3 mt-2 p-0 border-none">
        <button mat-button type="button" [disabled]="form().submitting()" (click)="canceled.emit()">
          {{ 'admin.beta_testers.cancel' | translate }}
        </button>
        <button mat-flat-button type="submit" [disabled]="form().disabled() || form().submitting()">
          {{ 'admin.beta_testers.add_confirm' | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class AddBetaTesterForm {
  public readonly added = output<void>();
  public readonly canceled = output<void>();

  readonly #store = inject(AdminBetaTestersStore);

  readonly #formBase = signal<AddBetaTesterFormValue>({ email: '', note: '' });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.email);
      email(fields.email);
      maxLength(fields.email, 320);
      maxLength(fields.note, 200);
    },
    {
      submission: {
        action: async (form) => {
          const value = form().value();

          try {
            await this.#store.addBetaTester({
              email: value.email.trim(),
              note: value.note.trim() || undefined,
            });
            this.added.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );
}
