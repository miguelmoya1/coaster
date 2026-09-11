import { Component, input } from '@angular/core';
import type { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-form-errors',
  imports: [TranslatePipe],
  template: `
    @if (errors().length > 0) {
      <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
        @for (error of errors(); track error) {
          <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
        }
      </div>
    }
  `,
})
export class FormErrors {
  readonly errors = input.required<readonly WithOptionalFieldTree<ValidationError>[]>();
}
