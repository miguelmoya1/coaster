import { Component, effect, model, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { CoasterInput } from '../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-inventory-search',
  imports: [FormRoot, MatIcon, FormField, CoasterInput, TranslatePipe],
  template: `
    <form [formRoot]="searchForm" class="w-full">
      <div class="relative w-full">
        <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</mat-icon>
        <input
          coasterInput
          class="pl-11"
          [formField]="searchForm.query"
          [placeholder]="'inventory.search_placeholder' | translate"
        />
      </div>
    </form>
  `,
})
export class InventorySearch {
  readonly query = model<string>('');

  readonly #formBase = signal({
    query: '',
  });

  readonly searchForm = form(this.#formBase);

  constructor() {
    effect(() => {
      const q = this.searchForm().value().query;
      if (untracked(() => this.query()) !== q) {
        untracked(() => this.query.set(q));
      }
    });

    effect(() => {
      const q = this.query();
      if (untracked(() => this.#formBase().query) !== q) {
        untracked(() => this.#formBase.set({ query: q }));
      }
    });
  }
}
