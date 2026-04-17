import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { CreateBarDto } from '@coaster/interfaces';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideMapPin, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateBar as CreateBarService, MyBars } from '../../../bars';
import { CoasterBtn, SectionTitle, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-create-bar',
  imports: [SectionTitle, TextInput, CoasterBtn, NgIcon, FormRoot, FormField, TranslatePipe],
  providers: [provideIcons({ lucideUsers, lucideMapPin, lucideArrowRight })],
  templateUrl: './create-bar.html',
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
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
