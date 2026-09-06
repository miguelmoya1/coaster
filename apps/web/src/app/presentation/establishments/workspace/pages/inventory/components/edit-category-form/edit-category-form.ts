import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, max, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { CategoriesStore } from '@coaster/categories';
import type { Category } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../components/field/input.directive';
import { IconPicker } from '../../../../../../components/icon-picker/icon-picker';
import { toBasisPoints, toPercentage } from '@coaster/common';

@Component({
  selector: 'coaster-edit-category-form',
  imports: [FormRoot, FormField, MatButton, TranslatePipe, IconPicker, Field, CoasterInput],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-field [label]="'inventory.edit_category.name_label' | translate">
          <input
            coasterInput
            enterkeyhint="send"
            [formField]="form.name"
            [placeholder]="'inventory.edit_category.name_placeholder' | translate"
          />
        </coaster-field>

        <coaster-icon-picker
          [formField]="form.icon"
          [label]="'inventory.edit_category.icon_label' | translate"
          [placeholder]="'inventory.edit_category.icon_placeholder' | translate"
        />

        <coaster-field
          [label]="'inventory.category_tax_rate_label' | translate"
          [hint]="'inventory.category_tax_rate_hint' | translate"
        >
          <input coasterInput type="number" step="0.5" [formField]="form.taxRatePercent" />
        </coaster-field>

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

          <button mat-flat-button class="w-full" type="submit" [disabled]="form().invalid() || form().submitting()">
            {{ 'common.update' | translate }}
          </button>
        </div>

        <div class="mt-4 border-t border-outline-variant/20 pt-4">
          <button
            mat-stroked-button
            class="warn w-full"
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
    taxRatePercent: toPercentage(this.category().taxRate),
  }));

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

      min(fields.taxRatePercent, 0);
      max(fields.taxRatePercent, 100);
    },
    {
      submission: {
        action: async (form) => {
          const { taxRatePercent, ...rest } = form().value();
          const payload = { ...rest, taxRate: toBasisPoints(taxRatePercent) };

          try {
            await this.#categoryStore.update(this.category().id, payload);
            this.updated.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
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
