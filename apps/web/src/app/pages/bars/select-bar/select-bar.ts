import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlusCircle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { BarCard, BarsStore } from '../../../bars';
import { CoasterBtn, SectionTitle } from '../../../shared';

@Component({
  selector: 'coaster-select-bar',
  imports: [SectionTitle, BarCard, TranslatePipe, CoasterBtn, NgIcon],
  providers: [provideIcons({ lucidePlusCircle })],
  templateUrl: './select-bar.html',
  host: {
    class: 'flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectBar {
  readonly #router = inject(Router);
  readonly #barsStore = inject(BarsStore);

  readonly bars = this.#barsStore.myBars;

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
