import { Component, input, model } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../field/field';
import { CoasterInput } from '../field/input.directive';

export const AVAILABLE_ICONS = [
  'category',
  'local_bar',
  'local_cafe',
  'restaurant',
  'fastfood',
  'sports_bar',
  'icecream',
  'tapas',
  'wine_bar',
  'liquor',
  'local_dining',
  'local_pizza',
  'lunch_dining',
  'coffee',
  'bakery_dining',
  'cake',
];

@Component({
  selector: 'coaster-icon-picker',
  imports: [TranslatePipe, Field, CoasterInput],
  template: `
    @if (!hidden()) {
      <coaster-field
        [class]="wrapperClass()"
        [label]="label()"
        [hint]="hint()"
        [errors]="touched() && invalid() ? errors() : []"
      >
        <select
          coasterInput
          [id]="id()"
          [value]="value()"
          [disabled]="disabled() || readonly()"
          (change)="onSelectionChange($event)"
          (blur)="touched.set(true)"
        >
          <button><selectedcontent></selectedcontent></button>

          <option value="" disabled>{{ placeholder() }}</option>
          @for (icon of availableIcons; track icon) {
            <option [value]="icon">
              <span class="glyph" [attr.data-glyph]="icon"></span>
              {{ icon }}
            </option>
          }
        </select>
      </coaster-field>
    }
  `,
  styles: [
    `
      .glyph::before {
        content: attr(data-glyph);
        font-family: 'Material Symbols Outlined';
        font-size: 1.25rem;
        line-height: 1;
      }
    `,
  ],
})
export class IconPicker {
  readonly value = model<string>('');
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly wrapperClass = input<string>('w-full');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  readonly availableIcons = AVAILABLE_ICONS;

  onSelectionChange(event: Event) {
    this.value.set((event.target as HTMLSelectElement).value);
    this.touched.set(true);
  }
}
