import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { BarListStore } from '@coaster/bars';
import { CurrentUser } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../components/loading/loading';
import { PageContainer } from '../../../components/page-container/page-container';
import { PageHeader } from '../../../components/page-header/page-header';
import { BarCard } from './components/bar-card/bar-card';

@Component({
  selector: 'coaster-select-bar',
  imports: [BarCard, TranslatePipe, MatButton, MatIcon, RouterLink, Loading, PageContainer, PageHeader],
  templateUrl: './select-bar.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class SelectBar {
  readonly #router = inject(Router);
  readonly #barListStore = inject(BarListStore);
  readonly #currentUser = inject(CurrentUser);

  readonly bars = this.#barListStore.list;
  readonly isAdmin = this.#currentUser.isAdmin;

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
