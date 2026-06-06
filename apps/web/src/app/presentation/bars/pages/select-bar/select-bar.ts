import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { Role } from '@coaster/core';
import { CurrentUser } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Loading } from '../../../components/loading/loading';
import { BarCard } from './components/bar-card/bar-card';

@Component({
  selector: 'coaster-select-bar',
  imports: [BarCard, TranslatePipe, MatButton, MatIcon, Loading],
  templateUrl: './select-bar.html',
  host: {
    class: 'flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SelectBar {
  readonly #router = inject(Router);
  readonly #barsStore = inject(BarsStore);
  readonly #currentUser = inject(CurrentUser);

  readonly bars = this.#barsStore.list;

  readonly isAdmin = computed(() => {
    return this.#currentUser.current.value()?.role === Role.ADMIN;
  });

  navigateToCreate() {
    this.#router.navigate(['/bars/create']);
  }

  navigateToAdminTemplates() {
    this.#router.navigate(['/admin/templates']);
  }

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}
