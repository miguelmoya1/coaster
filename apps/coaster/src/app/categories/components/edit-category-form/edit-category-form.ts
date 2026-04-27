import { Component, effect, input, output, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  TreeValidationResult,
} from '@angular/forms/signals';
import { Category, UpdateCategoryDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, FormFieldMessages, TextInput } from '../../../shared';

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
            [disabled]="disabled()"
            (click)="canceled.emit()"
          >
            {{ 'pantry.edit_category.cancel_btn' | translate }}
          </button>

          <button coaster-btn class="w-full" type="submit" variant="primary" [disabled]="disabled()">
            {{ 'pantry.edit_category.submit_btn' | translate }}
          </button>
        </div>

        <div class="mt-4 border-t border-outline-variant/20 pt-4">
          <button
            class="w-full py-2.5 rounded-xl font-medium text-error bg-error/10 hover:bg-error/20 transition-colors"
            type="button"
            [disabled]="disabled()"
            (click)="deleted.emit()"
          >
            {{ 'common.delete' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class EditCategoryForm {
  readonly category = input.required<Category>();
  readonly disabled = input.required<boolean>();
  readonly submitAction = input.required<(payload: UpdateCategoryDto) => Promise<TreeValidationResult>>();

  readonly canceled = output<void>();
  readonly deleted = output<void>();

  readonly #formBase = signal<Required<UpdateCategoryDto>>({
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
          const action = this.submitAction();

          return await action(payload);
        },
      },
    },
  );

  constructor() {
    effect(() => {
      const cat = this.category();
      if (cat) {
        this.#formBase.set({
          name: cat.name,
          icon: cat.icon ?? '',
        });
      }
    });
  }
}
