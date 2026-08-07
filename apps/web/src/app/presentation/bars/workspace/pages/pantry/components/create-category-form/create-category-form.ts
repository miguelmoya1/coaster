import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CategoriesStore } from '@coaster/categories';
import type { CreateCategoryDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconPicker } from '../../../../../../components/icon-picker/icon-picker';

@Component({
  selector: 'coaster-create-category-form',
  imports: [FormRoot, MatFormField, MatLabel, MatInput, MatError, FormField, MatButton, TranslatePipe, IconPicker],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.create_category.name_label' | translate }}</mat-label>
          <input
            matInput
            data-testid="category-name-input"
            [formField]="form.name"
            [placeholder]="'pantry.create_category.name_placeholder' | translate"
          />
          @if (form.name().errors().length > 0) {
            <mat-error>{{
              form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <coaster-icon-picker
          [formField]="form.icon"
          [label]="'pantry.create_category.icon_label' | translate"
          [placeholder]="'pantry.create_category.icon_placeholder' | translate"
        />

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
            [disabled]="form().submitting()"
            (click)="cancelHandler()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            data-testid="submit-btn"
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().submitting() || form().invalid()"
          >
            {{ 'common.create' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CreateCategoryForm {
  readonly #categoryStore = inject(CategoriesStore);
  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly #formBase = signal<Required<CreateCategoryDto>>({
    name: '',
    icon: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();

          try {
            await this.#categoryStore.create(payload);
            this.created.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected cancelHandler() {
    this.canceled.emit();
  }
}
