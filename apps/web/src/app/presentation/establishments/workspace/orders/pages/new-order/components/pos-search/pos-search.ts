import { Component, model } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-pos-search',
  imports: [TranslatePipe, MatIconButton, MatIcon],
  template: `
    <div class="relative w-full">
      <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</mat-icon>
      <input
        type="text"
        [value]="query()"
        (input)="onSearchInput($event)"
        [placeholder]="'orders.search_placeholder' | translate"
        class="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 rounded-xl pl-10 pr-10 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      @if (query()) {
        <button mat-icon-button (click)="query.set('')" class="absolute right-3 top-1/2 -translate-y-1/2">
          <mat-icon class="text-lg">close</mat-icon>
        </button>
      }
    </div>
  `,
})
export class PosSearch {
  readonly query = model<string>('');

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }
}
