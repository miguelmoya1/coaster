import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideMapPin, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionTitle } from '../../../components/section-title/section-title';
import { CreateBarForm } from './components/create-bar-form';

@Component({
  selector: 'coaster-create-bar',
  imports: [SectionTitle, TranslatePipe, CreateBarForm],
  providers: [provideIcons({ lucideUsers, lucideMapPin, lucideArrowRight })],
  host: {
    class: 'flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-4 mb-2">
        <div class="h-0.5 w-12 bg-primary"></div>
        <span class="text-primary font-bold tracking-[0.25em] uppercase text-sm">
          {{ 'bars.create.badge' | translate }}
        </span>
      </div>

      <coaster-section-title [heading]="'bars.create.title' | translate" isH1 />

      <p class="text-on-surface-variant text-sm mt-2 leading-relaxed">
        {{ 'bars.create.description' | translate }}
      </p>
    </div>

    <coaster-create-bar-form data-testid="create-bar-form" (formSubmitted)="onSubmit()" (formCancelled)="onCancel()" />
  `,
})
export default class CreateBar {
  readonly #router = inject(Router);

  protected onSubmit() {
    this.#router.navigate(['/bars/select']);
  }

  protected onCancel() {
    this.#router.navigate(['/bars/select']);
  }
}
