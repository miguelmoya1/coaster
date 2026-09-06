import { Component, computed, contentChild, input } from '@angular/core';
import type { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterInput } from './input.directive';

@Component({
  selector: 'coaster-field',
  imports: [TranslatePipe],
  host: { class: 'block' },
  template: `
    <label [attr.for]="control()?.id()" class="flex flex-col gap-1.5">
      @if (label()) {
        <span class="text-xs font-semibold text-on-surface-variant">{{ label() }}</span>
      }

      <ng-content />

      @if (error(); as error) {
        <span class="text-error text-xs" role="alert">{{ error.message || error.kind | translate: error }}</span>
      } @else if (hint()) {
        <span class="text-on-surface-variant text-xs">{{ hint() }}</span>
      }
    </label>
  `,
})
export class Field {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);

  protected readonly control = contentChild(CoasterInput, { descendants: true });

  protected readonly error = computed(() => this.errors()[0] ?? this.control()?.error());
}
