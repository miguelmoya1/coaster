import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { Category } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CategoriesStore } from '../../../../../../../categories';
import { CoasterBtn, FormFieldMessages, TextInput } from '../../../../../../../shared';

@Component({
  selector: 'coaster-edit-category-form',
  imports: [FormRoot, TextInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-text-input
          [formField]="form.name"
          [label]="'pantry.edit_category.name_label' | translate"
          [placeholder]="'pantry.edit_category.name_placeholder' | translate"
        />

        <coaster-text-input
          [formField]="form.icon"
          [label]="'pantry.edit_category.icon_label' | translate"
          [placeholder]="'pantry.edit_category.icon_placeholder' | translate"
        />

        @if (form().errors().length > 0) {
          <coaster-form-field-messages [invalid]="true" [errors]="form().errors()" />
        }

        <div class="flex justify-end mt-4 gap-2">
          <button
            coaster-btn
            class="w-full"
            type="button"
            variant="outline"
            [disabled]="form().submitting()"
            (click)="cancelHandler()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            coaster-btn
            class="w-full"
            type="submit"
            variant="primary"
            [disabled]="form().invalid() || form().submitting()"
          >
            {{ 'common.update' | translate }}
          </button>
        </div>

        <div class="mt-4 border-t border-outline-variant/20 pt-4">
          <button
            class="w-full py-2.5 rounded-xl font-medium text-error bg-error/10 hover:bg-error/20 transition-colors"
            type="button"
            [disabled]="form().submitting()"
            (click)="deleteHandler()"
          >
            {{ 'common.delete' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class EditCategoryForm {
  readonly #categoryStore = inject(CategoriesStore);

  readonly category = input.required<Category>();

  readonly canceled = output<void>();
  readonly deleted = output<void>();
  readonly updated = output<void>();

  readonly #formBase = linkedSignal(() => ({
    name: this.category().name,
    icon: this.category().icon || '',
  }));

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

          const error = await this.#categoryStore.update(this.category().id, payload);

          if (error) {
            return error;
          }

          this.updated.emit();

          return null;
        },
      },
    },
  );

  public cancelHandler() {
    this.canceled.emit();
  }

  public deleteHandler() {
    this.deleted.emit();
  }
}
