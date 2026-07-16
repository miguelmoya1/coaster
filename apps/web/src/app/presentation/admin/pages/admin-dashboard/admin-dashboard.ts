import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BarCard } from '../../../bars/pages/select-bar/components/bar-card/bar-card';
import { AdminBarsStore } from '../../../../bars/store/admin-bars.store';
import { Loading } from '../../../components/loading/loading';

@Component({
  selector: 'coaster-admin-dashboard',
  imports: [
    MatButton,
    MatLabel,
    MatFormField,
    MatInput,
    MatIcon,
    RouterLink,
    TranslatePipe,
    BarCard,
    Loading,
    FormRoot,
    FormField,
  ],
  templateUrl: './admin-dashboard.html',
  host: {
    class: 'flex flex-col gap-6 w-full max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminDashboard {
  readonly #router = inject(Router);
  readonly #store = inject(AdminBarsStore);

  readonly searchQuery = this.#store.searchQuery;
  readonly searchResults = this.#store.searchResults;
  readonly isSearching = this.#store.isSearching;

  readonly #formBase = signal({
    query: this.searchQuery(),
  });
  readonly searchForm = form(this.#formBase);

  constructor() {
    effect(() => {
      const q = this.searchForm().value().query ?? '';
      if (untracked(() => this.searchQuery()) !== q) {
        untracked(() => this.searchQuery.set(q));
      }
    });

    effect(() => {
      const q = this.searchQuery();
      if (untracked(() => this.#formBase().query) !== q) {
        untracked(() => this.#formBase.set({ query: q }));
      }
    });
  }

  selectBar(id: string) {
    this.#router.navigate(['/app/bars', id, 'dashboard']);
  }
}
