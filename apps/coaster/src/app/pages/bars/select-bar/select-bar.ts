import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucidePlusCircle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { BarCard, MyBars } from '../../../bars';
import { Button, SectionTitle } from '../../../shared';

@Component({
  selector: 'coaster-select-bar',
  imports: [SectionTitle, BarCard, TranslatePipe, Button],
  providers: [provideIcons({ lucidePlusCircle })],
  template: `
    <coaster-section-title
      [heading]="'bars.select.title' | translate"
      [description]="'bars.select.subtitle' | translate"
      centered
      isH1
      class="mb-6"
    />

    <div class="flex flex-col gap-4">
      @for (bar of bars.value() ?? []; track bar.id) {
        <coaster-bar-card [bar]="bar" (click)="selectBar(bar.id)" />
      } @empty {
        <div
          class="flex flex-col items-center justify-center p-8 bg-surface-container rounded-xl border border-dashed border-outline-variant text-center gap-3"
        >
          <span class="text-on-surface-variant font-medium">
            {{ 'bars.select.empty' | translate }}
          </span>
        </div>
      }

      <coaster-button
        variant="dashed"
        icon="lucidePlusCircle"
        iconPos="left"
        (click)="navigateToCreate()"
        class="mt-2"
      >
        {{ 'bars.select.create_btn' | translate }}
      </coaster-button>
    </div>
  `,
  host: {
    class:
      'flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectBar {
  readonly #router = inject(Router);
  readonly #myBars = inject(MyBars);

  readonly bars = this.#myBars.all;

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
