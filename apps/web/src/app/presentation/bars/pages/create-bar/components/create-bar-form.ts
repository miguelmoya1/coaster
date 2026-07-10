import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { BarsStore } from '@coaster/bars';
import type { CreateBarDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-create-bar-form',
  imports: [MatFormField, MatLabel, MatInput, MatError, MatButton, MatIcon, FormRoot, FormField, TranslatePipe],
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  template: `
    <form [formRoot]="barForm" class="mt-2 flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'bars.create.fields.name' | translate }}</mat-label>
          <input
            matInput
            data-testid="bar-name-input"
            [formField]="barForm.name"
            [placeholder]="'bars.create.fields.name_placeholder' | translate"
          />
          @if (barForm.name().errors().length > 0) {
            <mat-error>{{
              barForm.name().errors()[0].message || barForm.name().errors()[0].kind
                | translate: barForm.name().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>
      </div>

      <div class="flex items-center justify-center gap-4 mt-4">
        <button [attr.data-testid]="'cancel-btn'" mat-stroked-button type="button" (click)="cancel()">
          {{ 'common.cancel' | translate }}
        </button>

        <button
          [attr.data-testid]="'submit-btn'"
          mat-flat-button
          type="submit"
          [disabled]="barForm().disabled() || barForm().submitting() || barForm().invalid()"
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

          try {
            await this.#barsStore.create({ name: payload.name });
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
