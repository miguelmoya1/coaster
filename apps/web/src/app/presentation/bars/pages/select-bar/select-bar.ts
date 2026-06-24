import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { CurrentUser, Role } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../components/loading/loading';
import { BarCard } from './components/bar-card/bar-card';

@Component({
  selector: 'coaster-select-bar',
  imports: [BarCard, TranslatePipe, MatButton, MatIcon, Loading],
  templateUrl: './select-bar.html',
  host: {
    class: 'flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class SelectBar {
  readonly #router = inject(Router);
  readonly #barsStore = inject(BarsStore);
  readonly #currentUser = inject(CurrentUser);

  readonly bars = this.#barsStore.list;

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
