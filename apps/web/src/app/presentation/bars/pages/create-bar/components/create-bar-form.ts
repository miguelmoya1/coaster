import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { BarsStore } from '@coaster/bars';
import type { CreateBarDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TextInput } from '../../../../components/forms/text-input/text-input';

@Component({
  selector: 'coaster-create-bar-form',
  imports: [TextInput, MatButton, MatIcon, FormRoot, FormField, TranslatePipe],
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  template: `
    <form [formRoot]="barForm" class="mt-2 flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6">
        <coaster-text-input
          data-testid="bar-name-input"
          [formField]="barForm.name"
          [label]="'bars.create.fields.name' | translate"
          [placeholder]="'bars.create.fields.name_placeholder' | translate"
        />
      </div>

      <div class="flex items-center justify-center gap-4 mt-4">
        <button [attr.data-testid]="'cancel-btn'" mat-stroked-button type="button" (click)="cancel()">
          {{ 'common.cancel' | translate }}
        </button>

        <button
          [attr.data-testid]="'submit-btn'"
          mat-flat-button
          type="submit"
          [disabled]="barForm().invalid() || barForm().submitting()"
        >
          {{ 'common.create' | translate }}

          @if (barForm().submitting()) {
            <mat-icon class="text-on-primary-fixed text-xl animate-spin">sync</mat-icon>
          } @else {
            <mat-icon class="text-on-primary-fixed text-xl">arrow_forward</mat-icon>
          }
        </button>
      </div>
    </form>
  `,
})
export class CreateBarForm {
  public readonly formCancelled = output<void>();
  public readonly formSubmitted = output<void>();

  readonly #barsStore = inject(BarsStore);

  protected readonly formModel = signal<CreateBarDto>({
    name: '',
  });

  readonly barForm = form(
    this.formModel,
    (bar) => {
      required(bar.name);
      minLength(bar.name, 3);
      maxLength(bar.name, 100);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();

          const error = await this.#barsStore.create({ name: payload.name });

          if (error) {
            return error;
          }

          this.formSubmitted.emit();

          return null;
        },
      },
    },
  );

  protected cancel() {
    this.formCancelled.emit();
  }
}
