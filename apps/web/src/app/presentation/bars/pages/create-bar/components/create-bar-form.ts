import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { BarsStore } from '@coaster/bars';
import type { CreateBarDto } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideLoaderCircle, lucideMapPin, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn } from '../../../../components/button/button';
import { TextInput } from '../../../../components/forms/text-input/text-input';

@Component({
  selector: 'coaster-create-bar-form',
  imports: [TextInput, CoasterBtn, NgIcon, FormRoot, FormField, TranslatePipe],
  providers: [provideIcons({ lucideUsers, lucideMapPin, lucideArrowRight, lucideLoaderCircle })],
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formRoot]="barForm" class="mt-2 flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6">
        <coaster-text-input
          data-testid="bar-name-input"
          [formField]="barForm.name"
          [label]="'bars.create.fields.name' | translate"
          [placeholder]="'bars.create.fields.name_placeholder' | translate"
        />
      </div>

      <div class="grid grid-cols-2 gap-4 mt-4">
        <button [attr.data-testid]="'cancel-btn'" coaster-btn variant="outline" type="button" (click)="cancel()">
          {{ 'common.cancel' | translate }}
        </button>

        <button
          [attr.data-testid]="'submit-btn'"
          coaster-btn
          type="submit"
          variant="primary"
          [disabled]="barForm().invalid() || barForm().submitting()"
        >
          {{ 'common.create' | translate }}

          @if (barForm().submitting()) {
            <ng-icon name="lucideLoaderCircle" class="text-on-primary-fixed text-xl animate-spin" />
          } @else {
            <ng-icon name="lucideArrowRight" class="text-on-primary-fixed text-xl" />
          }
        </button>
      </div>
    </form>
  `,
})
export class CreateBarForm {
  public readonly formCancelled = output<void>();
  public readonly formSubmitted = output<void>();

  readonly #barsStore = inject(BarsStore);

  protected readonly formModel = signal<CreateBarDto>({
    name: '',
  });

  readonly barForm = form(
    this.formModel,
    (bar) => {
      required(bar.name);
      minLength(bar.name, 3);
      maxLength(bar.name, 100);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();

          const error = await this.#barsStore.create({ name: payload.name });

          if (error) {
            return error;
          }

          this.formSubmitted.emit();

          return null;
        },
      },
    },
  );

  protected cancel() {
    this.formCancelled.emit();
  }
}
