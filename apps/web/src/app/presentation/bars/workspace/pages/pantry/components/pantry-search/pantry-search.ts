import { Component, effect, model, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'coaster-pantry-search',
  imports: [FormRoot, MatFormFieldModule, MatInputModule, MatIconModule, FormField, TranslatePipe],
  template: `
    <form [formRoot]="searchForm" class="w-full">
      <mat-form-field appearance="outline" class="w-full">
        <mat-icon matPrefix>search</mat-icon>
        <input
          matInput
          [formField]="searchForm.query"
          [placeholder]="'pantry.search_placeholder' | translate"
        />
      </mat-form-field>
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
