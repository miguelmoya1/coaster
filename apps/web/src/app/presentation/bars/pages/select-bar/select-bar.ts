import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CoasterBtn, Loading, SectionTitle } from '@coaster/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlusCircle } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { BarCard } from './components/bar-card/bar-card';

@Component({
  selector: 'coaster-select-bar',
  imports: [SectionTitle, BarCard, TranslatePipe, CoasterBtn, NgIcon, Loading],
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

  readonly bars = this.#barsStore.list;

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
