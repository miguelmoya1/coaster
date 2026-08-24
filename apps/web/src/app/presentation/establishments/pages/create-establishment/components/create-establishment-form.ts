import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { EstablishmentListStore } from '@coaster/establishments';
import type { CreateEstablishmentDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../components/field/field';
import { CoasterInput } from '../../../../components/field/input.directive';
import { Spinner } from '../../../../components/spinner/spinner';

@Component({
  selector: 'coaster-create-establishment-form',
  imports: [Spinner, MatButton, MatIcon, FormRoot, FormField, TranslatePipe, Field, CoasterInput],
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  template: `
    <form [formRoot]="establishmentForm" class="mt-2 flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6">
        <coaster-field [label]="'establishments.create.fields.name' | translate">
          <input
            coasterInput
            data-testid="establishment-name-input"
            enterkeyhint="send"
            [formField]="establishmentForm.name"
            [placeholder]="'establishments.create.fields.name_placeholder' | translate"
          />
        </coaster-field>
      </div>

      <div class="flex items-center justify-center gap-4 mt-4">
        <button [attr.data-testid]="'cancel-btn'" mat-stroked-button type="button" (click)="cancel()">
          {{ 'common.cancel' | translate }}
        </button>

        <button
          [attr.data-testid]="'submit-btn'"
          mat-flat-button
          type="submit"
          class="gap-2 whitespace-nowrap"
          [disabled]="
            establishmentForm().disabled() || establishmentForm().submitting() || establishmentForm().invalid()
          "
        >
          {{ 'common.create' | translate }}

          @if (establishmentForm().submitting()) {
            <coaster-spinner />
          } @else {
            <mat-icon class="text-on-primary-fixed text-xl">arrow_forward</mat-icon>
          }
        </button>
      </div>
    </form>
  `,
})
export class CreateEstablishmentForm {
  public readonly formCancelled = output<void>();
  public readonly formSubmitted = output<void>();

  readonly #establishmentListStore = inject(EstablishmentListStore);

  protected readonly formModel = signal<CreateEstablishmentDto>({
    name: '',
  });

  readonly establishmentForm = form(
    this.formModel,
    (establishment) => {
      required(establishment.name);
      minLength(establishment.name, 3);
      maxLength(establishment.name, 100);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();

          try {
            await this.#establishmentListStore.create({ name: payload.name });
            this.formSubmitted.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected cancel() {
    this.formCancelled.emit();
  }
}
