import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatIcon,
    RouterLink,
    TranslatePipe,
    BarCard,
    Loading,
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

  selectBar(id: string) {
    this.#router.navigate(['/bars', id, 'dashboard']);
  }
}

