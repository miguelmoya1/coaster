import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { CategoriesStore } from '@coaster/categories';
import type { Category } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { TextInput } from '../../../../../../components/forms/text-input/text-input';

@Component({
  selector: 'coaster-edit-category-form',
  imports: [FormRoot, TextInput, FormField, MatButton, TranslatePipe],
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
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().invalid() || form().submitting()"
          >
            {{ 'common.update' | translate }}
          </button>
        </div>

        <div class="mt-4 border-t border-outline-variant/20 pt-4">
          <button
            mat-stroked-button
            color="warn"
            class="w-full"
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
