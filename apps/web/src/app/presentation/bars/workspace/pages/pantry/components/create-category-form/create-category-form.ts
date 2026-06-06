import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { CategoriesStore } from '@coaster/categories';
import type { CreateCategoryDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { FormFieldMessages } from '../../../../../../components/forms/form-field-messages/form-field-messages';
import { TextInput } from '../../../../../../components/forms/text-input/text-input';

@Component({
  selector: 'coaster-create-category-form',
  imports: [FormRoot, TextInput, FormField, MatButton, TranslatePipe, FormFieldMessages],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-text-input
          [formField]="form.name"
          [label]="'pantry.create_category.name_label' | translate"
          [placeholder]="'pantry.create_category.name_placeholder' | translate"
        />

        <coaster-text-input
          [formField]="form.icon"
          [label]="'pantry.create_category.icon_label' | translate"
          [placeholder]="'pantry.create_category.icon_placeholder' | translate"
        />

        @if (form().errors().length > 0) {
          <coaster-form-field-messages [invalid]="true" [errors]="form().errors()" />
        }

        <div class="flex justify-end mt-4 gap-2">
          <button
            mat-stroked-button
            class="h-16 w-full"
            type="button"
            [disabled]="form().submitting() || form().invalid()"
            (click)="cancelHandler()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            mat-flat-button
            class="h-16 w-full"
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
          const error = await this.#categoryStore.create(payload);

          if (error) {
            return error;
          }

          this.created.emit();

          return null;
        },
      },
    },
  );

  protected cancelHandler() {
    this.canceled.emit();
  }
}
