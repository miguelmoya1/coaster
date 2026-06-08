import { Component, effect, model, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { TextInput } from '../../../../../../components/forms/text-input/text-input';

@Component({
  selector: 'coaster-pantry-search',
  imports: [FormRoot, FormField, TextInput, TranslatePipe],
  template: `
    <form [formRoot]="searchForm" class="w-full">
      <coaster-text-input
        [formField]="searchForm.query"
        [placeholder]="'pantry.search_placeholder' | translate"
        icon="search"
      />
    </form>
  `,
  })
export class PantrySearch {
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
