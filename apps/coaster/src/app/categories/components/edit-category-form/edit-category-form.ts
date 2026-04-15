import { Component, effect, input, model, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { Category, UpdateCategoryDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, FormFieldMessages, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-edit-category-form',
  standalone: true,
  imports: [FormRoot, TextInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
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

        @if (error(); as error) {
          <coaster-form-field-messages [invalid]="true" [errors]="[{ message: error | translate, kind: '' }]" />
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
            {{ 'pantry.create_category.cancel_btn' | translate }}
          </button>

          <button coaster-btn class="w-full" type="submit" variant="primary" [disabled]="disabled()">
            {{ 'pantry.create_category.submit_btn' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class EditCategoryForm {
  public readonly category = input.required<Category>();
  public readonly editCategory = output<UpdateCategoryDto>();
  public readonly canceled = output<void>();

  public readonly disabled = input.required<boolean>();
  public readonly error = model.required<string | undefined>();

  readonly #formBase = signal<Required<UpdateCategoryDto>>({
    name: '',
    icon: '',
  });

  protected readonly form = form(
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
          this.editCategory.emit(payload);
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
