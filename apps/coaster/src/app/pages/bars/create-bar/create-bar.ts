import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { CreateBarDto } from '@coaster/interfaces';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideMapPin, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateBar as CreateBarService, MyBars } from '../../../bars';
import { Button, SectionTitle, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-create-bar',
  imports: [
    SectionTitle,
    TextInput,
    Button,
    FormRoot,
    FormField,
    TranslatePipe,
  ],
  providers: [provideIcons({ lucideUsers, lucideMapPin, lucideArrowRight })],
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-4 mb-2">
        <div class="h-0.5 w-12 bg-primary"></div>
        <span
          class="text-primary font-bold tracking-[0.25em] uppercase text-sm"
          >{{ 'bars.create.badge' | translate }}</span
        >
      </div>
      <coaster-section-title [heading]="'bars.create.title' | translate" isH1 />
      <p class="text-on-surface-variant text-sm mt-2 leading-relaxed">
        {{ 'bars.create.description' | translate }}
      </p>
    </div>

    <form [formRoot]="barForm" class="mt-2 flex flex-col gap-6">
      <div class="grid grid-cols-1 gap-6">
        <coaster-text-input
          [formField]="barForm.name"
          [label]="'bars.create.fields.name' | translate"
          [placeholder]="'bars.create.fields.name_placeholder' | translate"
        />
        <!-- <coaster-number-input
          [formField]="barForm.capacity"
          [label]="'bars.create.fields.capacity' | translate"
          icon="lucideUsers"
          [placeholder]="'bars.create.fields.capacity_placeholder' | translate"
          [showControls]="false"
        /> -->
      </div>

      <!-- <coaster-text-input
        [formField]="barForm.location"
        [label]="'bars.create.fields.location' | translate"
        [placeholder]="'bars.create.fields.location_placeholder' | translate"
        icon="lucideMapPin"
      /> -->

      <div class="grid grid-cols-2 gap-4 mt-4">
        <coaster-button variant="outline" type="button" (click)="cancel()">
          {{ 'bars.create.cancel_btn' | translate }}
        </coaster-button>
        <coaster-button
          type="submit"
          variant="primary"
          icon="lucideArrowRight"
          [disabled]="barForm().invalid()"
        >
          {{ 'bars.create.register_btn' | translate }}
        </coaster-button>
      </div>
    </form>
  `,
  host: {
    class:
      'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CreateBar {
  readonly #router = inject(Router);
  readonly #createBarService = inject(CreateBarService);
  readonly #myBars = inject(MyBars);

  readonly formModel = signal<CreateBarDto>({
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
          try {
            await this.#createBarService.create({ name: payload.name || '' });
            this.#myBars.reload();
            this.#router.navigate(['/bars/select']);
            return undefined;
          } catch {
            return undefined;
          }
        },
      },
    },
  );

  cancel() {
    this.#router.navigate(['/bars/select']);
  }
}
